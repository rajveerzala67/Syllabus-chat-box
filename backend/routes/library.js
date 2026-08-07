const express = require('express');
const router = express.Router();
const { protect, canManageLibrary } = require('../middleware/auth');
const {
  scanStudentNfc,
  checkInStudent,
  checkOutStudent,
  clearVisits,
  deleteVisit,
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  payFine,
  getDashboardStats,
  getStudentLibraryData
} = require('../controllers/libraryController');

// NFC Student Scanner & Check-in / Check-out
router.post('/scan-nfc', protect, canManageLibrary, scanStudentNfc);
router.post('/check-in', protect, canManageLibrary, checkInStudent);
router.post('/check-out', protect, canManageLibrary, checkOutStudent);
router.delete('/clear-visits', protect, clearVisits);
router.delete('/visits/:id', protect, canManageLibrary, deleteVisit);

// Books Catalog Management (CRUD)
router.get('/books', protect, getBooks);
router.post('/books', protect, canManageLibrary, addBook);
router.put('/books/:id', protect, canManageLibrary, updateBook);
router.delete('/books/:id', protect, canManageLibrary, deleteBook);

// Book Issue, Return, & Fines
router.post('/issue-book', protect, canManageLibrary, issueBook);
router.post('/return-book', protect, canManageLibrary, returnBook);
router.put('/transactions/:id/pay-fine', protect, canManageLibrary, payFine);

// Dashboard Analytics & Student View
router.get('/dashboard-stats', protect, canManageLibrary, getDashboardStats);
router.get('/my-library', protect, getStudentLibraryData);

module.exports = router;
