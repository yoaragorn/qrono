const mysql = require('mysql2');
require('dotenv').config();

// Create a connection "pool". A pool is more efficient than a single connection
// because it manages multiple connections that can be reused for concurrent requests.
// This is perfect for a web server.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  ssl: {
    "rejectUnauthorized": true
  }
});

// By using `pool.promise()`, we can use the modern async/await syntax
// instead of messy callbacks for our database queries.
module.exports = pool. promise();