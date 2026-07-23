const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: true,
    index: true
  },
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  nfcTagNumber: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true,
    index: true
  },
  division: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  scannedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    default: 'Present'
  }
}, {
  timestamps: true
});

// Ensure a student cannot scan more than once in the same session
AttendanceSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
