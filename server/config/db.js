// server/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // This is the standard configuration for Render's PostgreSQL.
  // The 'pg' library will automatically enable SSL if the connection string requires it.
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;