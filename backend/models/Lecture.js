const mongoose = require('mongoose');

const LectureSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true,
    index: true
  },
  division: {
    type: String,
    required: [true, 'Division is required'],
    uppercase: true,
    trim: true,
    index: true
  },
  room: {
    type: String,
    required: [true, 'Classroom number is required'],
    trim: true
  },
  lectureNumber: {
    type: String,
    required: [true, 'Lecture number is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Lecture date is required'],
    index: true
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'] // e.g. "09:00"
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'] // e.g. "10:00"
  },
  attendanceWindowMinutes: {
    type: Number,
    default: 10
  },
  isAttendanceWindowOpen: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lecture', LectureSchema);
