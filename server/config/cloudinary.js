// This file configures the connection to the Cloudinary account and sets up a specialized
// storage engine for multer. Instead of telling multer to save files to the local disk,
// this configuration tells multer to stream files directly to a folder named qrono in the
// Cloudinary cloud. It centralizes all the necessary credentials and upload parameters,
// so the route files (albums.js, memories.js) can use this cloud storage functionality
// with a single line of code.

const cloudinary = require('cloudinary').v2; // Import Cloudinary SDK
const { CloudinaryStorage } = require('multer-storage-cloudinary'); // Import Cloudinary Storage for multer

if (process.env.NODE_ENV !== 'production') { // Load environment variables from .env file in development
  require('dotenv').config(); // Ensure dotenv is loaded only in development
}

cloudinary.config({ // Configure Cloudinary with environment variables
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY, // Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET // Cloudinary API secret
});

const storage = new CloudinaryStorage({ // Create a new Cloudinary storage instance for multer
  cloudinary: cloudinary, // Pass the configured Cloudinary instance
  params: { // Define parameters for the storage
    folder: 'qrono', // A folder name in your Cloudinary account
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif'] // Allowed file formats for uploads
  }
});

module.exports = { // Export the configured Cloudinary instance and storage
  cloudinary, // Export the Cloudinary instance
  storage // Export the Cloudinary storage instance for multer
};