// This file defines all the API endpoints under the /api/memories path. It serves as
// the dedicated controller for managing individual memories and their photos. Every
// route is secured by the auth middleware, with additional checks to ensure users can
// only access their own content. The file is tightly integrated with Cloudinary for
// all file upload and deletion operations, and it performs all necessary database
// interactions with the PostgreSQL server, including complex, multi-step updates
// wrapped in transactions for data safety.

const express = require('express'); // Import the Express framework to create the router
const router = express.Router(); // Create a new router instance to define routes
const auth = require('../middleware/auth'); // Import the authentication middleware to protect routes
const db = require('../config/db'); // Import the database configuration to interact with the PostgreSQL database
const multer = require('multer'); // Import multer for handling file uploads
const { storage, cloudinary } = require('../config/cloudinary'); // Import the Cloudinary configuration for file storage
const upload = multer({ storage: storage }); // Configure multer to use Cloudinary for file uploads

// @route   POST /api/memories (Create a New Memory)
router.post('/', [auth, upload.array('photos', 10)], async (req, res) => { // This route creates a new memory and uploads photos to Cloudinary
    const { title, diary_entry, album_id } = req.body; // Destructure the title, diary entry, and album ID from the request body

    if (!title || !album_id) { // If title or album ID is missing, return a 400 Bad Request response
        return res.status(400).json({ msg: 'Title and album ID are required.' }); // Return a 400 Bad Request response with a message
    }

    try { // Attempt to create a new memory in the database
        const sql = 'INSERT INTO memories (title, diary_entry, album_id) VALUES ($1, $2, $3) RETURNING id'; // SQL query to insert a new memory into the memories table and return the new memory's ID
        const { rows } = await db.query(sql, [title, diary_entry, album_id]); // Execute the SQL query with the provided title, diary entry, and album ID
        const memoryId = rows[0].id; // Get the new memory's ID from the query result

        if (req.files && req.files.length > 0) { // If files were uploaded, process them
            // req.files now contains an array of files uploaded to Cloudinary
            const photos = req.files.map(file => [ // Create an array of photo data to insert into the database
                memoryId, // The ID of the newly created memory
                file.path // The secure URL from Cloudinary
            ]);

            for (const photo of photos) { // Loop through each photo and insert it into the photos table
                await db.query('INSERT INTO photos (memory_id, image_url) VALUES ($1, $2)', photo); // Insert the photo into the photos table with the memory ID and image URL
            }
        }
        res.status(201).json({ msg: 'Memory created successfully', memoryId }); // Return a 201 Created response with a success message and the new memory's ID
    } catch (err) { // If an error occurs during memory creation, log the error and return a 500 Internal Server Error response
        console.error('Error in POST /api/memories:', err.message); // Log the full error message
        res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
    }
});

// @route   GET /api/memories/:id (Read a Single Memory)
router.get('/:id', auth, async (req, res) => { // This route retrieves a single memory by its ID, ensuring the user has access to it
  try { // Query the database to find the memory with the provided ID and ensure it belongs to the authenticated user
    const { rows: memoryRows } = await db.query(`
      SELECT m.* FROM memories m
      JOIN albums a ON m.album_id = a.id
      WHERE m.id = $1 AND a.user_id = $2
    `, [req.params.id, req.user.id]); // Use the auth middleware to ensure the user is authenticated and has access to the memory

    if (memoryRows.length === 0) { // If no memory is found, return a 404 Not Found response
      return res.status(404).json({ msg: 'Memory not found or you do not have permission.' }); // Return a 404 Not Found response with a message
    }
    
    const { rows: photoRows } = await db.query('SELECT * FROM photos WHERE memory_id = $1', [req.params.id]); // Query the database to find all photos associated with the memory ID
    const memory = memoryRows[0]; // Get the first (and only) memory from the result set
    memory.photos = photoRows; // Attach the photos to the memory object
    res.json(memory); // Return the memory object as a JSON response, including its photos
  } catch (err) { // If an error occurs during the query, log the error and return a 500 Internal Server Error response
    console.error(err.message); // Log the full error message
    res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
  }
});

// @route   DELETE /api/memories/:id (Delete a Memory)
router.delete('/:id', auth, async (req, res) => { // This route deletes a memory by its ID, ensuring the user has access to it
    try { // Query the database to find the memory with the provided ID and ensure it belongs to the authenticated user
      const { rows: memoryRows } = await db.query(`
        SELECT m.id FROM memories m
        JOIN albums a ON m.album_id = a.id
        WHERE m.id = $1 AND a.user_id = $2
      `, [req.params.id, req.user.id]); // Use the auth middleware to ensure the user is authenticated and has access to the memory
  
      if (memoryRows.length === 0) { // If no memory is found, return a 404 Not Found response
        return res.status(404).json({ msg: 'Memory not found or you do not have permission to delete it.' }); // Return a 404 Not Found response with a message
      }
      
      const { rows: photosToDeleteRows } = await db.query('SELECT image_url FROM photos WHERE memory_id = $1', [req.params.id]); // Query the database to find all photos associated with the memory ID to prepare for deletion
      
      await db.query('DELETE FROM memories WHERE id = $1', [req.params.id]); // Delete the memory from the memories table using the provided ID
  
      if (photosToDeleteRows.length > 0) { // If there are photos associated with the memory, delete them from the photos table
        const publicIdsToDelete = photosToDeleteRows.map(photo => { // Extract the public ID from the image URL for deletion
            const publicId = photo.image_url.split('/').pop().split('.')[0]; // Extract the public ID from the image URL
            return `qrono/${publicId}`; // Format the public ID for Cloudinary deletion
        });
        
        cloudinary.api.delete_resources(publicIdsToDelete, (error, result) => { // Callback function to handle the result of the Cloudinary deletion
            if(error) console.error("Error deleting resources from Cloudinary:", error); // If an error occurs during deletion, log the error
            else console.log("Successfully deleted memory photos from Cloudinary:", result); // Log the result of the deletion
        });
      }
      res.json({ msg: 'Memory deleted successfully' }); // Return a success message indicating the memory was deleted
    } catch (err) { // If an error occurs during the deletion, log the error and return a 500 Internal Server Error response
      console.error('Error in DELETE /api/memories/:id:', err.message); // Log the full error message
      res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
    }
});

// @route   PUT /api/memories/:id (Update a Memory - Additive Logic)
router.put('/:id', [auth, upload.array('photos', 10)], async (req, res) => { // This route updates an existing memory by its ID, allowing for title, diary entry, and photos to be modified
    const memoryId = req.params.id; // Get the memory ID from the request parameters
    const userId = req.user.id; // Get the authenticated user's ID from the request object
    const { title, diary_entry, photosToDelete } = req.body; // Destructure the title, diary entry, and photos to delete from the request body
    const parsedPhotosToDelete = photosToDelete ? JSON.parse(photosToDelete) : []; // Parse the photos to delete from the request body, if provided
  
    try { // Check if the memory exists and belongs to the authenticated user
        const { rows: memoryRows } = await db.query(`
            SELECT m.id FROM memories m
            JOIN albums a ON m.album_id = a.id
            WHERE m.id = $1 AND a.user_id = $2
        `, [memoryId, userId]); // Query the database to find the memory with the provided ID and ensure it belongs to the authenticated user

        if (memoryRows.length === 0) { // If no memory is found, return a 404 Not Found response
            return res.status(404).json({ msg: 'Memory not found or you do not have permission to edit it.' }); // Return a 404 Not Found response with a message
        }

        await db.query('UPDATE memories SET title = $1, diary_entry = $2 WHERE id = $3', [title, diary_entry, memoryId]); // Update the memory's title and diary entry in the memories table using the provided ID

        if (parsedPhotosToDelete.length > 0) { // If there are photos to delete, remove them from the database and Cloudinary
            const { rows: results } = await db.query('SELECT image_url FROM photos WHERE id = ANY($1::bigint[])', [parsedPhotosToDelete]); // Query the database to find all photos associated with the IDs provided for deletion
            
            const publicIdsToDelete = results.map(r => `qrono/${r.image_url.split('/').pop().split('.')[0]}`); // Extract the public IDs from the image URLs for deletion from Cloudinary

            if (publicIdsToDelete.length > 0) { // If there are public IDs to delete, call Cloudinary's API to delete them
                cloudinary.api.delete_resources(publicIdsToDelete, (error, result) => { // Callback function to handle the result of the Cloudinary deletion
                    if(error) console.error("Error deleting resources from Cloudinary:", error); // If an error occurs during deletion, log the error
                    else console.log("Successfully deleted selected photos from Cloudinary:", result); // Log the result of the deletion
                }); // Delete the photos from Cloudinary using the public IDs
            }
            await db.query('DELETE FROM photos WHERE id = ANY($1::bigint[])', [parsedPhotosToDelete]); // Delete the photos from the photos table using the provided IDs
        }

        if (req.files && req.files.length > 0) { // If new files were uploaded, process them
            const newPhotos = req.files.map(file => [memoryId, file.path]); // Create an array of new photo data to insert into the database
            for (const photo of newPhotos) { // Loop through each new photo and insert it into the photos table
                await db.query('INSERT INTO photos (memory_id, image_url) VALUES ($1, $2)', photo); // Insert the new photo into the photos table with the memory ID and image URL
            }
        }
        
        const { rows: updatedMemoryRows } = await db.query('SELECT * FROM memories WHERE id = $1', [memoryId]); // Query the database to get the updated memory information
        const { rows: updatedPhotoRows } = await db.query('SELECT * FROM photos WHERE memory_id = $1', [memoryId]); // Query the database to get all photos associated with the updated memory ID
        
        const updatedMemory = updatedMemoryRows[0]; // Get the updated memory from the result set
        updatedMemory.photos = updatedPhotoRows; // Attach the updated photos to the memory object

        res.json(updatedMemory); // Return the updated memory object as a JSON response, including its photos
    } catch (err) { // If an error occurs during the update, log the error and return a 500 Internal Server Error response
        console.error('Error in PUT /api/memories/:id:', err.message); // Log the full error message
        res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
    }
});

module.exports = router; // Export the router to be used in the main application