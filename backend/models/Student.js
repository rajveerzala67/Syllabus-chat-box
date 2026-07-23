const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  enrollmentNumber: {
    type: String,
    required: [true, 'Enrollment Number is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile Number is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    index: true
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
  academicYear: {
    type: String,
    required: [true, 'Academic Year is required'],
    trim: true
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of Birth is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  photoUrl: {
    type: String,
    required: [true, 'Passport size photo URL is required']
  },
  photoPublicId: {
    type: String,
    required: [true, 'Photo public ID is required']
  },
  nfcTagNumber: {
    type: String,
    required: [true, 'NFC Tag Number or Enrollment is required'],
    unique: true,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', StudentSchema);
