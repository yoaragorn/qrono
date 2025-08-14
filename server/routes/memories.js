const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads')); 
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      req.fileValidationError = 'Only image files are allowed!';
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

// @route   POST /api/memories
router.post('/', [auth, upload.array('photos', 10)], async (req, res) => {
    if(req.fileValidationError) {
        return res.status(400).json({ msg: req.fileValidationError });
    }
    const { title, diary_entry, album_id } = req.body;
    try {
        const sql = 'INSERT INTO memories (title, diary_entry, album_id) VALUES ($1, $2, $3) RETURNING id';
        const { rows } = await db.query(sql, [title, diary_entry, album_id]);
        const memoryId = rows[0].id;

        if (req.files && req.files.length > 0) {
            const photos = req.files.map(file => {
                const relativePath = path.join('uploads', file.filename);
                return [memoryId, relativePath];
            });
            // PostgreSQL requires a different approach for bulk inserts with 'pg'
            for (const photo of photos) {
                await db.query('INSERT INTO photos (memory_id, image_url) VALUES ($1, $2)', photo);
            }
        }
        res.status(201).json({ msg: 'Memory created successfully', memoryId });
    } catch (err) {
        console.error('Error in POST /api/memories:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/memories/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: memoryRows } = await db.query(`
      SELECT m.* FROM memories m
      JOIN albums a ON m.album_id = a.id
      WHERE m.id = $1 AND a.user_id = $2
    `, [req.params.id, req.user.id]);

    if (memoryRows.length === 0) {
      return res.status(404).json({ msg: 'Memory not found or you do not have permission.' });
    }
    
    const { rows: photoRows } = await db.query('SELECT * FROM photos WHERE memory_id = $1', [req.params.id]);
    const memory = memoryRows[0];
    memory.photos = photoRows;
    res.json(memory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/memories/:id
router.delete('/:id', auth, async (req, res) => {
    try {
      const { rows: memoryRows } = await db.query(`
        SELECT m.id FROM memories m
        JOIN albums a ON m.album_id = a.id
        WHERE m.id = $1 AND a.user_id = $2
      `, [req.params.id, req.user.id]);
  
      if (memoryRows.length === 0) {
        return res.status(404).json({ msg: 'Memory not found or you do not have permission to delete it.' });
      }
      
      const { rows: photosToDeleteRows } = await db.query('SELECT image_url FROM photos WHERE memory_id = $1', [req.params.id]);
      
      await db.query('DELETE FROM memories WHERE id = $1', [req.params.id]);
  
      if (photosToDeleteRows.length > 0) {
        await Promise.all(photosToDeleteRows.map(async (photo) => {
            try {
                await fs.unlink(path.join(__dirname, '..', photo.image_url));
            } catch (fileErr) {
                console.error(`Error deleting file ${photo.image_url}:`, fileErr.message);
            }
        }));
      }
      res.json({ msg: 'Memory deleted successfully' });
    } catch (err) {
      console.error('Error in DELETE /api/memories/:id:', err.message);
      res.status(500).send('Server Error');
    }
});

// @route   PUT /api/memories/:id
router.put('/:id', [auth, upload.array('photos', 10)], async (req, res) => {
    const memoryId = req.params.id;
    const userId = req.user.id;
    const { title, diary_entry, photosToDelete } = req.body;
    const parsedPhotosToDelete = photosToDelete ? JSON.parse(photosToDelete) : [];
  
    try {
        const { rows: memoryRows } = await db.query(`
            SELECT m.id FROM memories m
            JOIN albums a ON m.album_id = a.id
            WHERE m.id = $1 AND a.user_id = $2
        `, [memoryId, userId]);

        if (memoryRows.length === 0) {
            return res.status(404).json({ msg: 'Memory not found or you do not have permission to edit it.' });
        }

        await db.query('UPDATE memories SET title = $1, diary_entry = $2 WHERE id = $3', [title, diary_entry, memoryId]);

        let filesToDeleteFromDisk = [];
        if (parsedPhotosToDelete.length > 0) {
            const { rows: results } = await db.query('SELECT image_url FROM photos WHERE id = ANY($1::bigint[])', [parsedPhotosToDelete]);
            filesToDeleteFromDisk = results.map(r => r.image_url);
            await db.query('DELETE FROM photos WHERE id = ANY($1::bigint[])', [parsedPhotosToDelete]);
        }

        if (req.files && req.files.length > 0) {
            const newPhotos = req.files.map(file => {
                const relativePath = path.join('uploads', file.filename);
                return [memoryId, relativePath];
            });
            for (const photo of newPhotos) {
                await db.query('INSERT INTO photos (memory_id, image_url) VALUES ($1, $2)', photo);
            }
        }
        
        if (filesToDeleteFromDisk.length > 0) {
            await Promise.all(filesToDeleteFromDisk.map(async (filePath) => {
                try {
                    await fs.unlink(path.join(__dirname, '..', filePath));
                } catch (fileErr) {
                    console.error(`Could not delete old file ${filePath}:`, fileErr.message);
                }
            }));
        }

        const { rows: updatedMemoryRows } = await db.query('SELECT * FROM memories WHERE id = $1', [memoryId]);
        const { rows: updatedPhotoRows } = await db.query('SELECT * FROM photos WHERE memory_id = $1', [memoryId]);
        
        const updatedMemory = updatedMemoryRows[0];
        updatedMemory.photos = updatedPhotoRows;

        res.json(updatedMemory);
    } catch (err) {
        console.error('Error in PUT /api/memories/:id:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;