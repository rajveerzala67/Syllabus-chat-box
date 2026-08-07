const multer = require('multer');

// Configure multer memory storage for Cloudinary stream upload
const storage = multer.memoryStorage();

// File type filter: accept images, PDF, Word, PowerPoint, Excel, and Text note files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/markdown', 'text/csv'
  ];
  
  const ext = (file.originalname || '').toLowerCase();
  const validExt = /\.(jpg|jpeg|png|webp|gif|svg|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|md)$/.test(ext);

  if (allowedMimeTypes.includes(file.mimetype) || validExt) {
    cb(null, true);
  } else {
    cb(new Error('Format not supported. Allowed formats: PDF, Word (DOCX), PowerPoint (PPTX), Excel (XLSX), Text (TXT), and Images.'), false);
  }
};

// Configure upload limits (20MB max for notes and presentations)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 Megabytes
  },
  fileFilter: fileFilter
});

module.exports = upload;
