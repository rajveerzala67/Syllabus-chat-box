const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { protect, requireRole, canUploadFiles } = require('../middleware/auth');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (accept images and pdfs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'), false);
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
        const newFile = new File({
          name: file.originalname,
          path: file.filename, // We store the filename inside the uploads folder
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
      res.status(500).json({ message: dbErr.message });
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
      return res.status(404).json({ message: 'File not found' });
    }

    const filePath = path.join(uploadDir, file.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File does not exist on disk' });
    }

    res.download(filePath, file.name);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const filePath = path.join(uploadDir, file.path);
    
    // Delete from file system
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record from Database
    await File.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
