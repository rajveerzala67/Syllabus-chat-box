const mongoose = require('mongoose');

const LibraryVisitSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  nfcTagNumber: {
    type: String,
    required: true,
    index: true
  },
  entryTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  exitTime: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Check-In', 'Check-Out', 'Inside Library', 'Outside Library'],
    default: 'Check-In',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LibraryVisit', LibraryVisitSchema);
