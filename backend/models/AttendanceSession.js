const mongoose = require('mongoose');

const AttendanceSessionSchema = new mongoose.Schema({
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
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
  room: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  attendanceStart: {
    type: Date,
    default: Date.now
  },
  attendanceEnd: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Closed'],
    default: 'Active',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);
