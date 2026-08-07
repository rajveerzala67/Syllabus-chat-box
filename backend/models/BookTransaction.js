const mongoose = require('mongoose');

const BookTransactionSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
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
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  expectedReturnDate: {
    type: Date,
    required: [true, 'Expected Return Date is required']
  },
  returnDate: {
    type: Date
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lateDays: {
    type: Number,
    default: 0
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  finePaid: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Issued', 'Returned', 'Overdue'],
    default: 'Issued',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BookTransaction', BookTransactionSchema);
