// This file uses the official Node.js PostgreSQL driver (pg) to create and configure
// a connection pool. A connection pool is far more efficient than creating a new
// connection for every API request. It reads the sensitive database credentials
// securely from a single environment variable (DATABASE_URL), configures the required
// SSL settings for production, and exports the ready-to-use pool.
// This allows any other file in the backend to run database queries without ever
// needing to know the actual connection details.

const { Pool } = require('pg'); // PostgreSQL connection pool configuration

// Only load the .env file if we are not in a production environment.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const pool = new Pool({  // Create a new pool instance
  connectionString: process.env.DATABASE_URL, // Use the DATABASE_URL from environment variables
  ssl: { // Configure SSL for secure connections
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

module.exports = pool; // Export the pool instance for use in other parts of the application