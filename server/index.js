const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('--- STARTING SERVER ---');
console.log('DATABASE_URL is set to:', process.env.DATABASE_URL ? 'A value is present' : '!!! UNDEFINED !!!');
console.log('NODE_ENV is set to:', process.env.NODE_ENV);
console.log('-----------------------');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 1. Create the Express App FIRST
const app = express();

// 2. Define constants and configurations
const PORT = process.env.PORT || 3001;
const corsOptions = {
  origin: '*', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, x-auth-token', 
};

// 3. Apply ALL middleware NEXT
app.use(cors(corsOptions));
app.use(express.json());

// Set up static file serving for the 'uploads' directory
const uploadsDir = path.join(__dirname, 'uploads');
// Ensure the directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('Created uploads directory.');
}
app.use('/uploads', express.static(uploadsDir));

// 4. Import and use your API routes AFTER middleware
const authRoutes = require('./routes/auth');
const albumRoutes = require('./routes/albums');
const memoryRoutes = require('./routes/memories');

app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/memories', memoryRoutes);

// 5. Start the server LAST
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});