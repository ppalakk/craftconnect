const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Read Cloudinary credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Multer storage setup for CraftConnect
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'CraftConnect_DEV',
    allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
  },
});

module.exports = {
  cloudinary,
  storage,
};