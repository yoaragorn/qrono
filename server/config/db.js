// server/config/db.js
const { Pool } = require('pg');

// Only load the .env file if we are not in a production environment.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// -----------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;