const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { protect, canUploadFiles } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Ensure uploads folder exists for local fallback
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer memory storage (allows Cloudinary upload)
const storage = multer.memoryStorage();

// File filter (accept images and pdfs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   GET /api/files
// @desc    Get all uploaded files metadata
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/files/upload
// @desc    Upload multiple files
// @access  Private (Coordinator, Teacher, Admin)
router.post('/upload', protect, canUploadFiles, (req, res) => {
  upload.array('files')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
      const savedFiles = [];
      for (const file of req.files) {
        // Upload to Cloudinary (or local fallback)
        const mimeType = file.mimetype || 'application/pdf';
        const cloudinaryResult = await uploadToCloudinary(file.buffer, 'class_files', mimeType);

        const newFile = new File({
          name: file.originalname,
          path: cloudinaryResult.public_id || file.originalname,
          url: cloudinaryResult.url,
          publicId: cloudinaryResult.public_id,
          mimeType: file.mimetype,
          uploadedBy: req.user.id
        });
        const saved = await newFile.save();
        savedFiles.push(saved);
      }

      res.status(201).json({
        message: 'Files uploaded successfully',
        files: savedFiles
      });
    } catch (dbErr) {
      console.error('Error in files upload:', dbErr);
      res.status(500).json({ message: dbErr.message || 'Error saving file metadata' });
    }
  });
});

// @route   GET /api/files/download/:id
// @desc    Download file by ID
// @access  Private
router.get('/download/:id', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File record not found in database.' });
    }

    // 1. If stored in Cloudinary or HTTP external URL, return JSON downloadUrl
    if (file.url && (file.url.startsWith('http://') || file.url.startsWith('https://') || file.url.startsWith('data:'))) {
      return res.json({
        success: true,
        downloadUrl: file.url,
        name: file.name
      });
    }

    // 2. If relative path, check local uploads directory
    const fileNameOnDisk = file.path ? path.basename(file.path) : file.name;
    const filePath = path.join(uploadDir, fileNameOnDisk);

    if (fs.existsSync(filePath)) {
      return res.download(filePath, file.name);
    }

    // 3. Fallback error when local file missing on Render disk
    res.status(404).json({
      message: 'This old file was uploaded before Cloudinary integration and is no longer stored on server disk. Please delete it and upload a new copy.'
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: error.message || 'Server error downloading file' });
  }
});

// @route   DELETE /api/files/:id
// @desc    Delete file by ID
// @access  Private (Coordinator, Teacher, Admin)
router.delete('/:id', protect, canUploadFiles, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete from Cloudinary if stored there
    if (file.publicId) {
      await deleteFromCloudinary(file.publicId);
    }

    // Delete from local filesystem if exists
    const fileNameOnDisk = file.path ? path.basename(file.path) : file.name;
    const filePath = path.join(uploadDir, fileNameOnDisk);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    // Delete record from Database
    await File.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
