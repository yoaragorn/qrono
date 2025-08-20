// This file defines all the API endpoints under the /api/albums path. It acts as the
// dedicated controller for all album-related operations. It uses the auth middleware
// to ensure every route is secure and only accessible by a logged-in user. It communicates
// with the PostgreSQL database for storing album metadata and with the Cloudinary
// service for storing, updating, and deleting album cover images. It's a complete
// implementation of a secure, full-stack CRUD (Create, Read, Update, Delete) resource.

const express = require('express'); // Import Express to create a router for album-related routes
const router = express.Router(); // Create a new router instance for handling album routes
const auth = require('../middleware/auth'); // Import the authentication middleware to protect routes
const db = require('../config/db'); // Import the database connection pool for executing SQL queries
const multer = require('multer'); // Import multer for handling file uploads
const { storage, cloudinary } = require('../config/cloudinary'); // Import the Cloudinary storage configuration for multer
const upload = multer({ storage: storage }); // Create a multer instance configured to use Cloudinary for file uploads

// @route   POST /api/albums (Create an Album)
router.post('/', [auth, upload.single('cover_image')], async (req, res) => { // Define a route to create a new album, protected by auth middleware and using multer for file upload
  const { title, description, visible } = req.body; // Destructure the request body to get album details
  const user_id = req.user.id; // Get the user ID from the authenticated user object attached by the auth middleware

  if (!title) { // Check if the title is provided
    return res.status(400).json({ msg: 'Title is required' }); // If not, send a 400 Bad Request response
  }

  try { // Start a try block to handle potential errors
    const cover_image_url = req.file ? req.file.path : null; // Get the cover image URL from the uploaded file, if it exists

    const sql = `INSERT INTO albums (title, description, visible, cover_image_url, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`; // SQL query to insert a new album into the database
    const values = [title, description, visible === 'true', cover_image_url, user_id]; // Prepare the values to be inserted into the database
    
    const { rows } = await db.query(sql, values); // Execute the SQL query using the database connection pool
    const newAlbumId = rows[0].id; // Get the ID of the newly created album from the returned rows

    const { rows: newAlbumRows } = await db.query('SELECT * FROM albums WHERE id = $1', [newAlbumId]); // Fetch the newly created album details from the database
    res.status(201).json(newAlbumRows[0]); // Send a 201 Created response with the new album details

  } catch (err) { // Catch any errors that occur during the process
    console.error('Error in POST /api/albums:', err.message); // Log the error message to the console
    res.status(500).send('Server Error'); // Send a 500 Internal Server Error response if something goes wrong
  }
});

// @route   GET /api/albums (Read All Albums)
router.get('/', auth, async (req, res) => { // Define a route to get all albums for the authenticated user 
  try { // Start a try block to handle potential errors
    const { rows } = await db.query('SELECT * FROM albums WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]); // SQL query to fetch all albums for the authenticated user, ordered by creation date
    res.json(rows); // Send the fetched albums as a JSON response
  } catch (err) { // Catch any errors that occur during the process
    console.error(err.message); // Log the error message to the console
    res.status(500).send('Server Error'); // Send a 500 Internal Server Error response if something goes wrong
  }
});

// @route   GET /api/albums/:id (Read a Single Album)
router.get('/:id', auth, async (req, res) => { // Define a route to get a single album by its ID, protected by auth middleware
  try { // Start a try block to handle potential errors
    const { rows } = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]); // SQL query to fetch the album by ID for the authenticated user
    if (rows.length === 0) { // Check if the album exists and belongs to the user
      return res.status(404).json({ msg: 'Album not found or you do not have permission.' }); // If not, send a 404 Not Found response
    }
    res.json(rows[0]); // Send the fetched album as a JSON response
  } catch (err) { // Catch any errors that occur during the process
    console.error(err.message); // Log the error message to the console
    res.status(500).send('Server Error'); // Send a 500 Internal Server Error response if something goes wrong
  }
});
      
// @route   GET /api/albums/:id/memories (Read an Album's Memories)
router.get('/:id/memories', auth, async (req, res) => { // Define a route to get all memories associated with a specific album, protected by auth middleware
  try { // Start a try block to handle potential errors
    const { rows: albumRows } = await db.query('SELECT id FROM albums WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]); // SQL query to fetch the album by ID for the authenticated user
    if (albumRows.length === 0) { // Check if the album exists and belongs to the user
      return res.status(404).json({ msg: 'Album not found.' }); // If not, send a 404 Not Found response
    }

    const { rows: memories } = await db.query('SELECT * FROM memories WHERE album_id = $1 ORDER BY created_at DESC', [req.params.id]); // SQL query to fetch all memories associated with the album, ordered by creation date

    const memoriesWithCovers = await Promise.all( // Use Promise.all to fetch cover images for each memory
      memories.map(async (memory) => { // For each memory, fetch the cover image
        const { rows: photos } = await db.query('SELECT image_url FROM photos WHERE memory_id = $1 LIMIT 1', [memory.id]); // SQL query to fetch the first photo associated with the memory
        return { ...memory, cover_image_url: photos.length > 0 ? photos[0].image_url : null }; // Return the memory with its cover image URL
      })
    );
    res.json(memoriesWithCovers); // Send the memories with cover images as a JSON response
  } catch (err) { // Catch any errors that occur during the process
    console.error('Error in GET /api/albums/:id/memories:', err.message); // Log the error message to the console
    res.status(500).send('Server Error'); // Send a 500 Internal Server Error response if something goes wrong
  }
});

// @route   PUT /api/albums/:id (Update an Album)
router.put('/:id', [auth, upload.single('cover_image')], async (req, res) => { // Define a route to update an existing album, protected by auth middleware and using multer for file upload
    const { title, description, visible } = req.body; // Destructure the request body to get updated album details
    const albumId = req.params.id; // Get the album ID from the request parameters
    const userId = req.user.id; // Get the user ID from the authenticated user object attached by the auth middleware
    
    try { // Start a try block to handle potential errors
      const { rows: albumRows } = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [albumId, userId]); // SQL query to fetch the album by ID for the authenticated user
      if (albumRows.length === 0) { // Check if the album exists and belongs to the user
        return res.status(404).json({ msg: 'Album not found or permission denied.' }); // If not, send a 404 Not Found response
      }
      const oldAlbum = albumRows[0]; // Store the old album details for later use
  
      const fieldsToUpdate = {}; // Create an object to hold the fields that need to be updated
      if (title !== undefined) fieldsToUpdate.title = title; // If title is provided, add it to the fields to update
      if (description !== undefined) fieldsToUpdate.description = description; // If description is provided, add it to the fields to update
      if (visible !== undefined) fieldsToUpdate.visible = visible === 'true'; // If visible is provided, convert it to a boolean and add it to the fields to update
  
      if (req.file) { // Check if a new cover image file was uploaded
        fieldsToUpdate.cover_image_url = req.file.path; // If so, add the new cover image URL to the fields to update
        if (oldAlbum.cover_image_url) { // If the old album had a cover image, delete it from Cloudinary
          const publicId = oldAlbum.cover_image_url.split('/').pop().split('.')[0]; // Extract the public ID from the old cover image URL
          cloudinary.uploader.destroy(`qrono/${publicId}`, (error, result) => { // Use Cloudinary's API to delete the old cover image
            if (error) console.error("Failed to delete old image from Cloudinary:", error); // Log an error if the deletion fails
            else console.log("Successfully deleted old image from Cloudinary:", result); // Log success if the deletion is successful
          });
        }
      }
  
      if (Object.keys(fieldsToUpdate).length > 0) { // Check if there are any fields to update
        const setClauses = Object.keys(fieldsToUpdate).map((key, index) => `"${key}" = $${index + 1}`).join(', '); // Create the SQL SET clause dynamically based on the fields to update
        const values = Object.values(fieldsToUpdate); // Get the values of the fields to update
        await db.query(`UPDATE albums SET ${setClauses} WHERE id = $${values.length + 1}`, [...values, albumId]); // Execute the SQL query to update the album with the new values
      }
      
      const { rows: updatedAlbumRows } = await db.query('SELECT * FROM albums WHERE id = $1', [albumId]); // Fetch the updated album details from the database
      res.json(updatedAlbumRows[0]); // Send the updated album as a JSON response
  
    } catch (err) { // Catch any errors that occur during the process
        console.error('Error in PUT /api/albums/:id:', err.message); // Log the error message to the console
        res.status(500).send('Server Error'); // Send a 500 Internal Server Error response if something goes wrong
    }
});

// @route   DELETE /api/albums/:id (Delete an Album)
router.delete('/:id', auth, async (req, res) => { // Define a route to delete an album by its ID, protected by auth middleware
    const albumId = req.params.id; // Get the album ID from the request parameters
    const userId = req.user.id; // Get the user ID from the authenticated user object attached by the auth middleware
    
    try { // Start a try block to handle potential errors
        const { rows: albumRows } = await db.query('SELECT id, cover_image_url FROM albums WHERE id = $1 AND user_id = $2', [albumId, userId]); // SQL query to fetch the album by ID for the authenticated user
        if (albumRows.length === 0) { // Check if the album exists and belongs to the user
            return res.status(404).json({ msg: 'Album not found.' }); // If not, send a 404 Not Found response
        }
        const coverImageToDeleteUrl = albumRows[0].cover_image_url; // Store the cover image URL for later deletion

        const { rows: photosToDeleteRows } = await db.query(`SELECT p.image_url FROM photos p JOIN memories m ON p.memory_id = m.id WHERE m.album_id = $1`, [albumId]); // SQL query to fetch all photos associated with the memories in the album
        
        await db.query('DELETE FROM albums WHERE id = $1', [albumId]); // Execute the SQL query to delete the album from the database

        const publicIdsToDelete = []; // Create an array to hold the public IDs of the resources to delete from Cloudinary

        if (coverImageToDeleteUrl) { // If the album has a cover image, prepare its public ID for deletion
            const publicId = coverImageToDeleteUrl.split('/').pop().split('.')[0]; // Extract the public ID from the cover image URL
            publicIdsToDelete.push(`qrono/${publicId}`); // Add the public ID to the array of public IDs to delete
        }
        if (photosToDeleteRows.length > 0) { // If there are photos to delete, prepare their public IDs for deletion
            photosToDeleteRows.forEach(photo => { // For each photo, extract its public ID
                const publicId = photo.image_url.split('/').pop().split('.')[0]; // Extract the public ID from the photo URL
                publicIdsToDelete.push(`qrono/${publicId}`); // Add the public ID to the array of public IDs to delete
            });
        }

        if (publicIdsToDelete.length > 0) { // If there are public IDs to delete, call Cloudinary's API to delete them
            cloudinary.api.delete_resources(publicIdsToDelete, (error, result) => { // Use Cloudinary's API to delete the resources
                if(error) console.error("Error deleting resources from Cloudinary:", error); // Log an error if the deletion fails
                else console.log("Successfully deleted resources from Cloudinary:", result); // Log success if the deletion is successful
            });
        }

        res.json({ msg: 'Album and all associated content deleted successfully' }); // Send a success response indicating the album and its associated content were deleted successfully
    } catch (err) { // Catch any errors that occur during the process
        console.error('Error in DELETE /api/albums/:id:', err.message); // Log the error message to the console
        res.status(500).send('Server Error'); // Send a 500 Internal Server Error response if something goes wrong
    }
});

module.exports = router; // Export the router to be used in the main application file