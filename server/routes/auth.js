const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Import our database connection pool
const jwt = require('jsonwebtoken');

const router = express.Router();  
const auth = require('../middleware/auth');

    

// === REGISTRATION ENDPOINT ===
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  // 1. Destructure username and password from the request body
  const { username, password } = req.body;

  // 2. Basic validation
  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    // 3. Hash the password before storing it
    // A "salt" is random data added to the password before hashing. 10 rounds is a strong standard.
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Save the new user to the database
    const newUser = {
      username,
      password_hash: passwordHash, // Use the column name from your DB schema
    };

    // The '?' are placeholders to prevent SQL injection attacks
    const [result] = await db.query('INSERT INTO users SET ?', newUser);
    
    // 5. Send a success response
    res.status(201).json({ 
        msg: 'User registered successfully',
        userId: result.insertId // Send back the new user's ID
    });

  } catch (err) {
    console.error(err.message);
    // Check for a duplicate username error
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ msg: 'Username already exists' });
    }
    res.status(500).send('Server Error');
  }
});

// === LOGIN ENDPOINT ===
// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // 1. Check if the user exists
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = users[0];

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 2. If user exists, compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 3. If password matches, create the JWT payload
        const payload = {
            user: {
                id: user.id
            }
        };

        // 4. Sign the token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' }, // Token will be valid for 5 hours
            (err, token) => {
                if (err) throw err;
                // 5. Send the token back to the client
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// === GET LOGGED-IN USER ENDPOINT ===
// @route   GET /api/auth/me
// @desc    Get the current logged-in user's data (without password)
// @access  Private
router.get('/me', auth, async (req, res) => {
  // The 'auth' middleware has already run and attached the user's info to req.user.
  try {
    // We use the user ID from the token (req.user.id) to fetch their data from the DB.
    // We select id and username but explicitly EXCLUDE the password_hash for security.
    const [users] = await db.query('SELECT id, username, created_at FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];

    if (!user) {
        return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// === VERIFY PASSWORD FOR PRIVATE MODE ===
// @route   POST /api/auth/verify-password
// @desc    Verify user's current password
// @access  Private (requires user to be logged in)
router.post('/verify-password', auth, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id; // Get user ID from the 'auth' middleware

  if (!password) {
    return res.status(400).json({ msg: 'Password is required' });
  }

  try {
    // 1. Fetch the user's stored password hash from the database
    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      // This should theoretically never happen if auth middleware is working
      return res.status(404).json({ msg: 'User not found' });
    }

    const user = users[0];

    // 2. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      // Send a specific, clear error message for incorrect passwords
      return res.status(400).json({ msg: 'The password you entered is incorrect.' });
    }

    // 3. If password matches, send a success response
    res.json({ msg: 'Password verified successfully.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;