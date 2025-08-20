// Import necessary tools and frameworks
const express = require('express'); // Import the main Express framework
const cors = require('cors'); // Import CORS for handling cross-origin requests
const path = require('path'); // Import path for handling file paths
const fs = require('fs'); // Import fs for file system operations

// DEBUGGING -----------------------------
// console.log('--- STARTING SERVER ---');
// console.log('DATABASE_URL is set to:', process.env.DATABASE_URL ? 'A value is present' : '!!! UNDEFINED !!!');
// console.log('NODE_ENV is set to:', process.env.NODE_ENV);
// console.log('-----------------------');
// ---------------------------------------

if (process.env.NODE_ENV !== 'production') { // Load environment variables from .env file ONLY in development
  require('dotenv').config();
}


const app = express(); // Create an instance of the Express application

// Define constants and configurations
const PORT = process.env.PORT || 3001; // Set the port for the server, defaulting to 3001 if not specified
const corsOptions = { // Configure CORS options
  origin: '*',  // Allow requests from any origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow specific HTTP methods
  allowedHeaders: 'Content-Type, x-auth-token', // Allow specific headers, like
  // the x-auth-token header, which is necessary for our JWT authentication to work.
};

// Apply ALL middleware NEXT
app.use(cors(corsOptions)); // Enable CORS with the specified options
app.use(express.json()); // Parse incoming JSON requests

// Set up static file serving for the 'uploads' directory.
// This is a special type of middleware.
// It tells Express: "If you receive a request whose URL starts
// with /uploads (e.g., .../uploads/albumcover-123.jpg), do not treat it as an API call.
// Instead, look for a file with that name inside the uploadsDir
// and serve it directly to the browser." This is how your images are displayed.
const uploadsDir = path.join(__dirname, 'uploads'); // Define the path to the uploads directory
// Ensure the directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir); // Create the uploads directory if it does not exist
    console.log('Created uploads directory.'); // Log that the directory was created
}
app.use('/uploads', express.static(uploadsDir)); // Serve static files from the uploads directory

// Import and use your API routes AFTER middleware
const authRoutes = require('./routes/auth'); // Import authentication routes
const albumRoutes = require('./routes/albums'); // Import album routes
const memoryRoutes = require('./routes/memories'); // Import memory routes

app.use('/api/auth', authRoutes); // Use authentication routes under the /api/auth path
app.use('/api/albums', albumRoutes); // Use album routes under the /api/albums path
app.use('/api/memories', memoryRoutes); // Use memory routes under the /api/memories path

// Start the server LAST
app.listen(PORT, () => { // Start the server and listen on the specified port
  console.log(`Server is listening on port ${PORT}`); // Log that the server is running
});