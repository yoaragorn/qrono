const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    // Use a different prefix to distinguish album covers from memory photos
    cb(null, 'albumcover-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// @route   POST /api/albums
// @desc    Create a new album
// @access  Private
router.post('/', [auth, upload.single('cover_image')], async (req, res) => {
  const { title, description, visible } = req.body;
  const user_id = req.user.id;

  if (!title) {
    return res.status(400).json({ msg: 'Title is required' });
  }

try {
    const cover_image_url = req.file ? path.join('uploads', req.file.filename) : null;

    const sql = `INSERT INTO albums (title, description, visible, cover_image_url, user_id) VALUES (?, ?, ?, ?, ?)`;
    const values = [
      title,
      description,
      visible === 'true',
      cover_image_url,
      user_id
    ];

    const [result] = await db.query(sql, values);
    const newAlbumId = result.insertId;

    // Fetch the newly created album to send back a complete object.
    const [newAlbums] = await db.query('SELECT * FROM albums WHERE id = ?', [newAlbumId]);
    
    // Send the raw, newly created album object directly.
    // The frontend will build the full URL.
    res.status(201).json(newAlbums[0]);
    // ----------------------------------

  } catch (err) {
    console.error('Error in POST /api/albums:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/albums
// @desc    Get all albums for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const [albums] = await db.query('SELECT * FROM albums WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(albums);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/albums/:id
// @desc    Get a single album by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Fetch the album from the database using the ID from the URL parameters.
    const [albums] = await db.query('SELECT * FROM albums WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    
    // Check if an album was found.
    if (albums.length === 0) {
      return res.status(404).json({ msg: 'Album not found or you do not have permission.' });
    }

    // Send the first (and only) result back to the client.
    res.json(albums[0]);
    // ------------------------------------

  } catch (err) {
    console.error('Error in GET /api/albums/:id:', err.message);
    res.status(500).send('Server Error');
  }
});

      
// @route   GET /api/albums/:id/memories
// @desc    Get all memories for a specific album, including a full cover image URL for each.
// @access  Private
router.get('/:id/memories', auth, async (req, res) => {
  try {
    // Step 1: Verify the user owns the album.
    const [albums] = await db.query('SELECT id FROM albums WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (albums.length === 0) {
      return res.status(404).json({ msg: 'Album not found or you do not have permission to view it.' });
    }

    // Step 2: Fetch all the base memories for that album.
    const [memories] = await db.query('SELECT * FROM memories WHERE album_id = ? ORDER BY created_at DESC', [req.params.id]);

    // Step 3: For each memory, fetch its first photo and build the full URL for its cover.
    const memoriesWithCovers = await Promise.all(
      memories.map(async (memory) => {
        const [photos] = await db.query('SELECT image_url FROM photos WHERE memory_id = ? LIMIT 1', [memory.id]);
        
        const coverImagePath = photos.length > 0 ? photos[0].image_url : null;
        
        return {
          ...memory,
          cover_image_url: coverImagePath 
        };
      })
    );

    // Step 4: Send the final, enriched array of memories back to the client.
    res.json(memoriesWithCovers);

  } catch (err) {
    console.error('Error in GET /api/albums/:id/memories:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/albums/:id
// @desc    Update an album's details or cover image
// @access  Private
router.put('/:id', [auth, upload.single('cover_image')], async (req, res) => {
  const { title, description, visible } = req.body;
  const albumId = req.params.id;
  const userId = req.user.id;
  
  try {
    // Step 1: Verify ownership and get the current album data
    const [albums] = await db.query('SELECT * FROM albums WHERE id = ? AND user_id = ?', [albumId, userId]);
    if (albums.length === 0) {
      return res.status(404).json({ msg: 'Album not found or permission denied.' });
    }
    const oldAlbum = albums[0];

    // Step 2: Prepare the fields to update
    const fieldsToUpdate = {};
    if (title !== undefined) fieldsToUpdate.title = title;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (visible !== undefined) fieldsToUpdate.visible = visible === 'true';

    // Step 3: Handle file upload if a new file is present
    if (req.file) {
      // Set the new image URL
      fieldsToUpdate.cover_image_url = path.join('uploads', req.file.filename);
      
      // If there was an old cover image, delete it from the file system
      if (oldAlbum.cover_image_url) {
        try {
          await fs.unlink(path.join(__dirname, '..', oldAlbum.cover_image_url));
          console.log(`Successfully deleted old cover: ${oldAlbum.cover_image_url}`);
        } catch (fileErr) {
          console.error(`Could not delete old cover file:`, fileErr.message);
        }
      }
    }

    // Step 4: Perform the database update if there's anything to change
    if (Object.keys(fieldsToUpdate).length > 0) {
        await db.query('UPDATE albums SET ? WHERE id = ?', [fieldsToUpdate, albumId]);
    }
    
    // Step 5: Fetch the fully updated album to return to the client
    const [updatedAlbums] = await db.query('SELECT * FROM albums WHERE id = ?', [albumId]);
    res.json(updatedAlbums[0]);
  } catch (err) {
      console.error('Error in PUT /api/albums/:id:', err.message);
      res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/albums/:id
// @desc    Delete an album, its memories, all associated photos, and its cover image.
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  const albumId = req.params.id;
  const userId = req.user.id;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: Verify user owns the album AND get the cover_image_url BEFORE deleting.
    const [albums] = await connection.query('SELECT id, cover_image_url FROM albums WHERE id = ? AND user_id = ?', [albumId, userId]);
    if (albums.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ msg: 'Album not found or you do not have permission to delete it.' });
    }
    // --- THIS IS THE NEW PART ---
    const albumToDelete = albums[0];
    const coverImageToDelete = albumToDelete.cover_image_url;
    // ----------------------------

    // Step 2: Find all photos associated with ALL memories in this album.
    const [photosToDelete] = await connection.query(`
      SELECT p.image_url FROM photos p
      JOIN memories m ON p.memory_id = m.id
      WHERE m.album_id = ?
    `, [albumId]);

    // Step 3: Delete the album record from the database.
    // ON DELETE CASCADE will handle deleting all 'memories' and 'photos' table rows.
    await connection.query('DELETE FROM albums WHERE id = ?', [albumId]);

    // Step 4: Commit the successful database transaction.
    await connection.commit();

    // Step 5: Now that the DB is updated, delete all the files from the file system.
    
    // 5a. Delete the album's cover image, if it exists.
    if (coverImageToDelete) {
      try {
        const filePath = path.join(__dirname, '..', coverImageToDelete);
        await fs.unlink(filePath);
        console.log(`Successfully deleted album cover: ${filePath}`);
      } catch (fileErr) {
        console.error(`Error deleting album cover ${coverImageToDelete}:`, fileErr.message);
      }
    }

    // 5b. Delete all the memory photos, if they exist.
    if (photosToDelete.length > 0) {
      console.log(`Preparing to delete ${photosToDelete.length} memory photos for album ${albumId}...`);
      await Promise.all(
        photosToDelete.map(async (photo) => {
          try {
            const filePath = path.join(__dirname, '..', photo.image_url);
            await fs.unlink(filePath);
            console.log(`Successfully deleted memory photo: ${filePath}`);
          } catch (fileErr) {
            console.error(`Error deleting memory photo ${photo.image_url}:`, fileErr.message);
          }
        })
      );
    }

    res.json({ msg: 'Album and all associated content deleted successfully' });

  } catch (err) {
    await connection.rollback();
    console.error('Error in DELETE /api/albums/:id:', err.message);
    res.status(500).send('Server Error');
  } finally {
    connection.release();
  }
});

module.exports = router;