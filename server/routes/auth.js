// This file defines all the API endpoints under the /api/auth path. It serves as the
// dedicated controller for user authentication and session management. It uses the
// bcryptjs library for state-of-the-art password hashing and the jsonwebtoken library
// to create and manage secure, stateless sessions. This file is responsible for who
// can access the application and for validating their identity for sensitive operations.

const express = require('express'); // Import the Express framework to create the router
const router = express.Router(); // Create a new router instance to define routes
const bcrypt = require('bcryptjs'); // Import bcryptjs for hashing passwords
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for creating and verifying JWTs
const db = require('../config/db'); // Import the database configuration to interact with the PostgreSQL database
const auth = require('../middleware/auth'); // Import the authentication middleware to protect routes

// @route   POST /api/auth/register (Create a New User).
// Purpose: To allow a new user to create an account. This is a public route.
// Input: Expects a username and password in the JSON request body.
router.post('/register', async (req, res) => { // Check if the request body contains username and password
  const { username, password } = req.body; // Destructure the username and password from the request body
  if (!username || !password) { // If either username or password is missing, return a 400 Bad Request response
    return res.status(400).json({ msg: 'Please enter all fields' }); // Return a 400 Bad Request response with a message
  }
  try { // Attempt to register the user
    const salt = await bcrypt.genSalt(10); // Generate a salt for hashing the password
    const passwordHash = await bcrypt.hash(password, salt); // Hash the password using the generated salt
    
    // The query is case-sensitive, so we ensure column names are quoted
    const sql = 'INSERT INTO users ("username", "password_hash") VALUES ($1, $2) RETURNING "id"'; // SQL query to insert a new user into the users table and return the new user's ID
    const { rows } = await db.query(sql, [username, passwordHash]); // Execute the SQL query with the provided username and hashed password
    
    res.status(201).json({ msg: 'User registered successfully', userId: rows[0].id }); // Return a 201 Created response with a success message and the new user's ID

  } catch (err) { // If an error occurs during registration, log the error and return a 500 Internal Server Error response
    console.error('Error in /api/auth/register:', err); // Log the full error
    if (err.code === '23505') { // Check if the error is a unique constraint violation (PostgreSQL error code for duplicate entry)
        return res.status(400).json({ msg: 'Username already exists' });  // Return a 400 Bad Request response with a specific message for duplicate usernames
    }
    res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
  }
});

// @route   POST /api/auth/login (Authenticate an Existing User)
// Purpose: To verify a user's credentials and issue them a session token (JWT). This is a public route.
// Input: Expects a username and password.
router.post('/login', async (req, res) => { // Check if the request body contains username and password
  const { username, password } = req.body; // Destructure the username and password from the request body
  if (!username || !password) { // If either username or password is missing, return a 400 Bad Request response
    return res.status(400).json({ msg: 'Please enter all fields' }); // Return a 400 Bad Request response with a message
  }
  try { // Attempt to log in the user
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]); // Query the database to find a user with the provided username
    const user = rows[0]; // If no user is found, rows will be empty, so we check if user exists
    if (!user) { // If no user is found, return a 400 Bad Request response
      return res.status(400).json({ msg: 'Invalid credentials' }); // Return a 400 Bad Request response with a message
    }
    const isMatch = await bcrypt.compare(password, user.password_hash); // Compare the provided password with the stored hashed password
    if (!isMatch) { // If the passwords do not match, return a 400 Bad Request response
      return res.status(400).json({ msg: 'Invalid credentials' }); // Return a 400 Bad Request response with a message
    }
    const payload = { user: { id: user.id } }; // Create a payload for the JWT containing the user's ID
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => { // Sign the JWT with the payload and a secret key, setting it to expire in 5 hours
      if (err) throw err; // If an error occurs during signing, throw the error
      res.json({ token }); // Return a JSON response containing the signed JWT token
    });
  } catch (err) { // If an error occurs during login, log the error and return a 500 Internal Server Error response
    console.error('Error in /api/auth/login:', err); // Log the full error
    res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
  }
});

// Add logging to the other routes too for consistency
// Purpose: To allow the frontend to fetch the profile information of the currently authenticated user.
router.get('/me', auth, async (req, res) => { // This route retrieves the authenticated user's profile information
    try { // Query the database to get the user's profile information based on the authenticated user's ID
        const { rows } = await db.query('SELECT id, username, created_at FROM users WHERE id = $1', [req.user.id]); // Use the auth middleware to ensure the user is authenticated
        res.json(rows[0]); // Return the user's profile information as a JSON response
    } catch (err) { // If an error occurs during the query, log the error and return a 500 Internal Server Error response
        console.error('Error in /api/auth/me:', err); // Log the full error
        res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
    }
});

// @route   POST /api/auth/verify-password (Re-authenticate for Sensitive Actions)
// Purpose: To provide the "dual-layer security" for unlocking private albums.
// Input: Expects the user's password in the request body.
router.post('/verify-password', auth, async (req, res) => { // This route verifies the user's password for sensitive actions
    const { password } = req.body; // Destructure the password from the request body
    if (!password) { // If the password is not provided, return a 400 Bad Request response
        return res.status(400).json({ msg: 'Password is required' }); // Return a 400 Bad Request response with a message
    }
    try { // Attempt to verify the user's password
        const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]); // Query the database to get the user's password hash based on the authenticated user's ID
        const user = rows[0]; // If no user is found, rows will be empty, so we check if user exists
        if (!user) { // If no user is found, return a 404 Not Found response
            return res.status(404).json({ msg: 'User not found' }); // Return a 404 Not Found response with a message
        }
        const isMatch = await bcrypt.compare(password, user.password_hash); // Compare the provided password with the stored hashed password
        if (!isMatch) { // If the passwords do not match, return a 400 Bad Request response
            return res.status(400).json({ msg: 'The password you entered is incorrect.' }); // Return a 400 Bad Request response with a message
        }
        res.json({ msg: 'Password verified successfully.' }); // If the password matches, return a success message
    } catch (err) { // If an error occurs during password verification, log the error and return a 500 Internal Server Error response
        console.error('Error in /api/auth/verify-password:', err); // Log the full error
        res.status(500).send('Server Error'); // Return a generic 500 Internal Server Error response
    }
});

module.exports = router; // Export the router to be used in the main application