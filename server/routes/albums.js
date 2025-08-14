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
    cb(null, 'albumcover-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// @route   POST /api/albums
router.post('/', [auth, upload.single('cover_image')], async (req, res) => {
  const { title, description, visible } = req.body;
  const user_id = req.user.id;

  if (!title) {
    return res.status(400).json({ msg: 'Title is required' });
  }

  try {
    const cover_image_url = req.file ? path.join('uploads', req.file.filename) : null;
    
    const sql = `INSERT INTO albums (title, description, visible, cover_image_url, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const values = [title, description, visible === 'true', cover_image_url, user_id];
    
    const { rows } = await db.query(sql, values);
    const newAlbumId = rows[0].id;

    const { rows: newAlbumRows } = await db.query('SELECT * FROM albums WHERE id = $1', [newAlbumId]);
    res.status(201).json(newAlbumRows[0]);

  } catch (err) {
    console.error('Error in POST /api/albums:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/albums
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM albums WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/albums/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Album not found or you do not have permission.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
      
// @route   GET /api/albums/:id/memories
router.get('/:id/memories', auth, async (req, res) => {
  try {
    const { rows: albumRows } = await db.query('SELECT id FROM albums WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (albumRows.length === 0) {
      return res.status(404).json({ msg: 'Album not found or you do not have permission to view it.' });
    }

    const { rows: memories } = await db.query('SELECT * FROM memories WHERE album_id = $1 ORDER BY created_at DESC', [req.params.id]);

    const memoriesWithCovers = await Promise.all(
      memories.map(async (memory) => {
        const { rows: photos } = await db.query('SELECT image_url FROM photos WHERE memory_id = $1 LIMIT 1', [memory.id]);
        const coverImagePath = photos.length > 0 ? photos[0].image_url : null;
        return { ...memory, cover_image_url: coverImagePath };
      })
    );
    res.json(memoriesWithCovers);
  } catch (err) {
    console.error('Error in GET /api/albums/:id/memories:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/albums/:id
router.put('/:id', [auth, upload.single('cover_image')], async (req, res) => {
    const { title, description, visible } = req.body;
    const albumId = req.params.id;
    const userId = req.user.id;
    
    try {
      const { rows: albumRows } = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [albumId, userId]);
      if (albumRows.length === 0) {
        return res.status(404).json({ msg: 'Album not found or permission denied.' });
      }
      const oldAlbum = albumRows[0];
  
      const fieldsToUpdate = {};
      if (title !== undefined) fieldsToUpdate.title = title;
      if (description !== undefined) fieldsToUpdate.description = description;
      if (visible !== undefined) fieldsToUpdate.visible = visible === 'true';
  
      if (req.file) {
        fieldsToUpdate.cover_image_url = path.join('uploads', req.file.filename);
        if (oldAlbum.cover_image_url) {
          try {
            await fs.unlink(path.join(__dirname, '..', oldAlbum.cover_image_url));
          } catch (fileErr) {
            console.error(`Could not delete old cover file:`, fileErr.message);
          }
        }
      }
  
      if (Object.keys(fieldsToUpdate).length > 0) {
        const setClauses = Object.keys(fieldsToUpdate).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
        const values = Object.values(fieldsToUpdate);
        await db.query(`UPDATE albums SET ${setClauses} WHERE id = $${values.length + 1}`, [...values, albumId]);
      }
      
      const { rows: updatedAlbumRows } = await db.query('SELECT * FROM albums WHERE id = $1', [albumId]);
      res.json(updatedAlbumRows[0]);
  
    } catch (err) {
        console.error('Error in PUT /api/albums/:id:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/albums/:id
router.delete('/:id', auth, async (req, res) => {
    const albumId = req.params.id;
    const userId = req.user.id;
    
    try {
        const { rows: albumRows } = await db.query('SELECT id, cover_image_url FROM albums WHERE id = $1 AND user_id = $2', [albumId, userId]);
        if (albumRows.length === 0) {
            return res.status(404).json({ msg: 'Album not found or you do not have permission to delete it.' });
        }
        const coverImageToDelete = albumRows[0].cover_image_url;

        const { rows: photosToDeleteRows } = await db.query(`SELECT p.image_url FROM photos p JOIN memories m ON p.memory_id = m.id WHERE m.album_id = $1`, [albumId]);
        
        await db.query('DELETE FROM albums WHERE id = $1', [albumId]);

        if (coverImageToDelete) {
            try {
                await fs.unlink(path.join(__dirname, '..', coverImageToDelete));
            } catch (fileErr) {
                console.error(`Error deleting album cover ${coverImageToDelete}:`, fileErr.message);
            }
        }
        if (photosToDeleteRows.length > 0) {
            await Promise.all(photosToDeleteRows.map(async (photo) => {
                try {
                    await fs.unlink(path.join(__dirname, '..', photo.image_url));
                } catch (fileErr) {
                    console.error(`Error deleting memory photo ${photo.image_url}:`, fileErr.message);
                }
            }));
        }
        res.json({ msg: 'Album and all associated content deleted successfully' });
    } catch (err) {
        console.error('Error in DELETE /api/albums/:id:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;