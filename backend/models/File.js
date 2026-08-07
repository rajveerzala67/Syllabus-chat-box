const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String
  },
  publicId: {
    type: String
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete files after 24 hours (86400 seconds)
FileSchema.index({ uploadedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('File', FileSchema);
