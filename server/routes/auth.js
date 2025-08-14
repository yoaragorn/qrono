const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ msg: 'Please enter all fields' });
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const sql = 'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id';
    const { rows } = await db.query(sql, [username, passwordHash]);
    res.status(201).json({ msg: 'User registered successfully', userId: rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ msg: 'Username already exists' });
    res.status(500).send('Server Error');
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ msg: 'Please enter all fields' });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/me', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, created_at FROM users WHERE id = $1', [req.user.id]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/verify-password', auth, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ msg: 'Password is required' });
    try {
        const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];
        if (!user) return res.status(404).json({ msg: 'User not found' });
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ msg: 'The password you entered is incorrect.' });
        res.json({ msg: 'Password verified successfully.' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;