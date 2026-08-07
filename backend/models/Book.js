const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book Title is required'],
    trim: true,
    index: true
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    index: true
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true
  },
  publisher: {
    type: String,
    default: '',
    trim: true
  },
  edition: {
    type: String,
    default: '1st Edition',
    trim: true
  },
  totalCopies: {
    type: Number,
    required: [true, 'Total Copies is required'],
    min: [1, 'Total Copies must be at least 1'],
    default: 1
  },
  availableCopies: {
    type: Number,
    required: [true, 'Available Copies is required'],
    min: [0, 'Available Copies cannot be negative'],
    default: 1
  },
  shelfNumber: {
    type: String,
    required: [true, 'Shelf Number is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Available', 'Out of Stock', 'Discontinued'],
    default: 'Available'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Book', BookSchema);
