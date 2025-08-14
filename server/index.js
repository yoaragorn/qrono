// Import required packages
const express = require('express');
const cors = require('cors');
const fs = require('fs'); 

// --- DIAGNOSTIC LOG ---
console.log('--- STARTING SERVER ---');
console.log('DATABASE_URL is set to:', process.env.DATABASE_URL ? 'A value is present' : '!!! UNDEFINED !!!');
console.log('NODE_ENV is set to:', process.env.NODE_ENV);
console.log('-----------------------');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('Created uploads directory.');
}


// Import routes
const authRoutes = require('./routes/auth'); // <-- IMPORT YOUR ROUTES
const albumRoutes = require('./routes/albums');   // <-- IMPORT ALBUMS
const memoryRoutes = require('./routes/memories'); // <-- IMPORT MEMORIES

// Create the Express app
const app = express();

// Define the port, using the .env value or a default
const PORT = process.env.PORT || 3001;

const corsOptions = {
  // We can be more specific here for production, but '*' is fine for local dev
  origin: '*', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  // This is the crucial line: it explicitly allows our custom header
  allowedHeaders: 'Content-Type, x-auth-token', 
};

// --- Middleware ---
// Enable CORS for all routes, so the Vue client can talk to the server
app.use(cors(corsOptions));
// Enable the Express server to parse JSON bodies in requests
app.use(express.json());

// --- Routes ---
// A simple test route to make sure the server is running
app.get('/', (req, res) => {
  res.json({ message: 'Hello from the Qrono API!' });
});

// Tell Express to use the auth routes for any request starting with '/api/auth'
app.use('/api/auth', authRoutes); // <-- USE YOUR ROUTES
app.use('/api/albums', albumRoutes);   // <-- USE ALBUMS
app.use('/api/memories', memoryRoutes); // <-- USE MEMORIES

// --- Server Startup ---
// Start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});