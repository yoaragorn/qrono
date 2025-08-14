// server/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// The 'pg' library is smart. If DATABASE_URL exists (like on Render), it will use it.
// For local development, you'll need to create a local PostgreSQL instance and add its
// connection URL to your .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // This SSL setting is required for Render's production environment.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;