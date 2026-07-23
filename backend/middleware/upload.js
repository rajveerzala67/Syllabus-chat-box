const multer = require('multer');

// Configure multer memory storage for Cloudinary stream upload
const storage = multer.memoryStorage();

// File type filter: accept images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, JPG, PNG, and WEBP image files are allowed.'), false);
  }
};

// Configure upload limits (5MB max)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  },
  fileFilter: fileFilter
});

module.exports = upload;
