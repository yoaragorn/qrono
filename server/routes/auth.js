const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // The query is case-sensitive, so we ensure column names are quoted
    const sql = 'INSERT INTO users ("username", "password_hash") VALUES ($1, $2) RETURNING "id"';
    const { rows } = await db.query(sql, [username, passwordHash]);
    
    res.status(201).json({ msg: 'User registered successfully', userId: rows[0].id });

  } catch (err) {
    console.error('Error in /api/auth/register:', err); // Log the full error
    if (err.code === '23505') { // '23505' is the PostgreSQL code for unique violation
        return res.status(400).json({ msg: 'Username already exists' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    // --- ADD LOGGING HERE AS WELL ---
    console.error('Error in /api/auth/login:', err);
    res.status(500).send('Server Error');
  }
});

// Add logging to the other routes too for consistency
router.get('/me', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, created_at FROM users WHERE id = $1', [req.user.id]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Error in /api/auth/me:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/verify-password', auth, async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ msg: 'Password is required' });
    }
    try {
        const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'The password you entered is incorrect.' });
        }
        res.json({ msg: 'Password verified successfully.' });
    } catch (err) {
        console.error('Error in /api/auth/verify-password:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;