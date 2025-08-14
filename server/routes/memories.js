const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use the promise-based version for async/await
const storage = multer.diskStorage({ // --- Multer Configuration for File Uploads ---
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads')); 
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => { // File filter to accept only image files
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      req.fileValidationError = 'Only image files are allowed!';
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

// @route   POST /api/memories
// @desc    Create a new memory with photos
// @access  Private
router.post('/', [auth, upload.array('photos', 10)], async (req, res) => {
  // --- DEBUGGING STEP ---
  console.log('Request Body:', req.body);
  console.log('Request Files:', req.files);
  // If req.files is undefined or empty here, the problem is with multer or the frontend FormData.
  // ----------------------
  if(req.fileValidationError) {
    return res.status(400).json({ msg: req.fileValidationError });
  }

  const { title, diary_entry, album_id } = req.body;
  // ... validation for title/album_id ...

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    // ... insert the new memory ...
    const newMemory = { title, diary_entry, album_id };
    const [memoryResult] = await connection.query('INSERT INTO memories SET ?', newMemory);
    const memoryId = memoryResult.insertId;

    if (req.files && req.files.length > 0) {
      // --- THIS IS THE FINAL, CORRECT FIX ---
      const photos = req.files.map(file => {
        // We use path.join to create a clean, OS-agnostic relative path.
        // This will create a string like 'uploads/photos-175...png'.
        const relativePath = path.join('uploads', file.filename);
        return [memoryId, relativePath];
      });
      // ------------------------------------
      await connection.query('INSERT INTO photos (memory_id, image_url) VALUES ?', [photos]);
    }
    
    await connection.commit();
    res.status(201).json({ msg: 'Memory created successfully', memoryId });

  } catch (err) {
    await connection.rollback();
    console.error('Error in POST /api/memories:', err.message);
    res.status(500).send('Server Error');
  } finally {
    connection.release();
  }});

// @route   GET /api/memories/:id
// @desc    Get a single memory with its photos
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Get the memory and join with album to verify user ownership
    const [memories] = await db.query(`
      SELECT m.* FROM memories m
      JOIN albums a ON m.album_id = a.id
      WHERE m.id = ? AND a.user_id = ?
    `, [req.params.id, req.user.id]);

    if (memories.length === 0) {
      return res.status(404).json({ msg: 'Memory not found or you do not have permission.' });
    }

    // Get associated photos
    const [photos] = await db.query('SELECT * FROM photos WHERE memory_id = ?', [req.params.id]);

    const memory = memories[0];
    memory.photos = photos; // Attach photos to the memory object

    res.json(memory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/memories/:id
// @desc    Delete a memory
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // To ensure a user can only delete their OWN memories, we must perform a JOIN.
    // This query finds the memory but also joins with the albums table to check the user_id.
    const [memories] = await db.query(`
      SELECT m.id FROM memories m
      JOIN albums a ON m.album_id = a.id
      WHERE m.id = ? AND a.user_id = ?
    `, [req.params.id, req.user.id]);

    // If the query returns no rows, the memory doesn't exist or the user doesn't own it.
    if (memories.length === 0) {
      return res.status(404).json({ msg: 'Memory not found or you do not have permission to delete it.' });
    }

    // Step 2: BEFORE deleting the memory from the DB, get the file paths of all associated photos.
    const [photosToDelete] = await db.query('SELECT image_url FROM photos WHERE memory_id = ?', [req.params.id]);

    // Step 3: Delete the memory from the database.
    // Thanks to ON DELETE CASCADE, this will also delete the corresponding rows from the 'photos' table.
    await db.query('DELETE FROM memories WHERE id = ?', [req.params.id]);

    // Step 4: Now, delete the actual files from the server's file system.
    if (photosToDelete.length > 0) {
      console.log(`Preparing to delete ${photosToDelete.length} files...`);
      // Use Promise.all to handle all file deletions concurrently.
      await Promise.all(
        photosToDelete.map(async (photo) => {
          try {
            const filePath = path.join(__dirname, '..', photo.image_url);
            await fs.unlink(filePath); // fs.unlink is the command to delete a file
            console.log(`Successfully deleted file: ${filePath}`);
          } catch (fileErr) {
            // Log an error if a specific file couldn't be deleted, but don't stop the whole process.
            // This can happen if the file was already manually deleted or is missing.
            console.error(`Error deleting file ${photo.image_url}:`, fileErr.message);
          }
        })
      );
    }

    res.json({ msg: 'Memory deleted successfully' });

  } catch (err) {
    console.error('Error in DELETE /api/memories/:id:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/memories/:id
// @desc    Update a memory's details and add/remove specific photos.
// @access  Private
router.put('/:id', [auth, upload.array('photos', 10)], async (req, res) => {
  // Get all necessary data from the request
  const memoryId = req.params.id;
  const userId = req.user.id;
  const { title, diary_entry, photosToDelete } = req.body;
  
  // Safely parse the list of photo IDs to delete
  const parsedPhotosToDelete = photosToDelete ? JSON.parse(photosToDelete) : [];

  // Use a database connection from the pool to support transactions
  const connection = await db.getConnection();

  try {
    // --- DATABASE TRANSACTION: START ---
    // All subsequent database operations will be part of this transaction.
    // If any step fails, we can undo all previous steps.
    await connection.beginTransaction();

    // Step 1: Security - Verify the user owns the memory they are trying to edit.
    const [memories] = await connection.query(`
      SELECT m.id FROM memories m
      JOIN albums a ON m.album_id = a.id
      WHERE m.id = ? AND a.user_id = ?
    `, [memoryId, userId]);

    if (memories.length === 0) {
      // If no memory is found, it's either the wrong ID or a permission issue.
      // We must rollback before sending the error response.
      await connection.rollback();
      connection.release();
      return res.status(404).json({ msg: 'Memory not found or you do not have permission to edit it.' });
    }

    // Step 2: Update the memory's text fields (title and diary entry).
    await connection.query('UPDATE memories SET title = ?, diary_entry = ? WHERE id = ?', [title, diary_entry, memoryId]);

    // Step 3: Handle Photo Deletions
    let filesToDeleteFromDisk = [];
    if (parsedPhotosToDelete.length > 0) {
      // First, get the file paths from the DB for the photos we are about to delete.
      // We need these paths to delete the actual files from the disk later.
      const [results] = await connection.query('SELECT image_url FROM photos WHERE id IN (?)', [parsedPhotosToDelete]);
      filesToDeleteFromDisk = results.map(r => r.image_url);

      // Now, delete the records for these photos from the `photos` table.
      await connection.query('DELETE FROM photos WHERE id IN (?)', [parsedPhotosToDelete]);
    }

    // Step 4: Handle New Photo Additions
    if (req.files && req.files.length > 0) {
      // Map the newly uploaded files to the format needed for a bulk INSERT query.
      const newPhotos = req.files.map(file => {
        const relativePath = path.join('uploads', file.filename);
        return [memoryId, relativePath];
      });
      // Insert the new photo records into the `photos` table.
      await connection.query('INSERT INTO photos (memory_id, image_url) VALUES ?', [newPhotos]);
    }
    
    // --- DATABASE TRANSACTION: END ---
    // If all the above steps succeeded without error, commit the changes to the database.
    await connection.commit();

    // Step 5: File System Cleanup
    // Now that the database is safely updated, we can delete the old physical files from the disk.
    if (filesToDeleteFromDisk.length > 0) {
      await Promise.all(
        filesToDeleteFromDisk.map(async (filePath) => {
          try {
            // Construct the full path and delete the file.
            await fs.unlink(path.join(__dirname, '..', filePath));
          } catch (fileErr) {
            // Log if a specific file fails to delete, but don't crash the request.
            console.error(`Could not delete old file ${filePath}:`, fileErr.message);
          }
        })
      );
    }

    // Step 6: Send a helpful response back to the client.
    // Fetch the fully updated memory, including its final list of photos.
    const [updatedMemories] = await db.query('SELECT * FROM memories WHERE id = ?', [memoryId]);
    const [updatedPhotos] = await db.query('SELECT * FROM photos WHERE memory_id = ?', [memoryId]);
    
    const updatedMemory = updatedMemories[0];
    updatedMemory.photos = updatedPhotos;

    res.json(updatedMemory);

  } catch (err) {
    // If any error occurred in the 'try' block, undo ALL database changes.
    await connection.rollback();
    console.error('Error in PUT /api/memories/:id:', err.message);
    res.status(500).send('Server Error');
  } finally {
    // ALWAYS release the database connection back to the pool.
    connection.release();
  }
});

module.exports = router;