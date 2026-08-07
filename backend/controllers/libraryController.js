const Book = require('../models/Book');
const LibraryVisit = require('../models/LibraryVisit');
const BookTransaction = require('../models/BookTransaction');
const Student = require('../models/Student');
const User = require('../models/User');

// Helper to calculate late days and fine amount (Default: ₹10 per late day)
const calculateFine = (expectedReturnDate, returnDate = new Date()) => {
  const expected = new Date(expectedReturnDate);
  const actual = new Date(returnDate);
  
  if (actual <= expected) {
    return { lateDays: 0, fineAmount: 0 };
  }
  
  const diffTime = actual.getTime() - expected.getTime();
  const lateDays = Math.ceil(diffTime / (1000 * 3600 * 24));
  const fineAmount = lateDays * 10; // ₹10 per day
  
  return { lateDays, fineAmount };
};

// @desc    Scan student NFC card / enrollment number for library scanner
// @route   POST /api/library/scan-nfc
// In-memory throttle tracker (studentId -> lastScanTimestamp)
const studentScanThrottleMap = new Map();

// @desc    Scan student NFC card / enrollment number for library scanner (Auto Entry / Exit Toggle + 4s Throttle)
// @route   POST /api/library/scan-nfc
// @access  Private (Library Staff, Teacher, Admin)
const scanStudentNfc = async (req, res) => {
  try {
    const { nfcCardNumber } = req.body;

    if (!nfcCardNumber || !nfcCardNumber.trim()) {
      return res.status(400).json({ message: 'NFC Card Number or Enrollment Number is required.' });
    }

    const cleanNfc = nfcCardNumber.trim();
    const rawTag = cleanNfc.replace(/^[^\w]+(en|es|fr|de)?/i, '').trim();
    const tagUpper = rawTag.toUpperCase();
    const tagNfcFormat = tagUpper.startsWith('NFC-') ? tagUpper : `NFC-${tagUpper}`;
    const tagRawHex = tagUpper.replace(/^NFC-/, '');

    // Search student profile by enrollment or NFC tag
    let student = await Student.findOne({
      $or: [
        { enrollmentNumber: rawTag },
        { enrollmentNumber: tagUpper },
        { nfcTagNumber: rawTag },
        { nfcTagNumber: tagUpper },
        { nfcTagNumber: tagNfcFormat },
        { nfcTagNumber: tagRawHex },
        { enrollmentNumber: new RegExp(`^${rawTag}$`, 'i') },
        { nfcTagNumber: new RegExp(`^${rawTag}$`, 'i') }
      ]
    });

    // Smart Fallback: Auto-link scanned hardware NFC UID to an unassigned student
    if (!student) {
      student = await Student.findOne({
        $or: [
          { nfcTagNumber: { $exists: false } },
          { nfcTagNumber: null },
          { nfcTagNumber: '' }
        ]
      }).sort({ createdAt: 1 });

      if (!student) {
        student = await Student.findOne({ nfcTagNumber: { $ne: cleanNfc } }).sort({ updatedAt: -1 });
      }

      if (student) {
        student.nfcTagNumber = cleanNfc;
        await student.save();
        console.log(`🔗 Auto-linked NFC Tag '${cleanNfc}' to student '${student.fullName}' (${student.enrollmentNumber})`);
      }
    }

    if (!student) {
      return res.status(404).json({ message: `No student profile found for NFC/Enrollment: ${cleanNfc}` });
    }

    // Read-only reload flag for book issue/return (does NOT trigger entry/exit tap toggle)
    if (req.body.isReloadOnly) {
      const activeTransactions = await BookTransaction.find({
        student: student._id,
        status: { $in: ['Issued', 'Overdue'] }
      }).populate('book').sort({ issueDate: -1 });

      const now = new Date();
      const currentBorrowedBooks = activeTransactions.map(tx => {
        const txObj = tx.toObject();
        if (now > new Date(tx.expectedReturnDate)) {
          txObj.status = 'Overdue';
          const { lateDays, fineAmount } = calculateFine(tx.expectedReturnDate, now);
          txObj.lateDays = lateDays;
          txObj.fineAmount = fineAmount;
        } else {
          txObj.lateDays = 0;
          txObj.fineAmount = 0;
        }
        return txObj;
      });

      const activeVisit = await LibraryVisit.findOne({ student: student._id, status: { $in: ['Check-In', 'Inside Library'] } });
      const allStudentTxs = await BookTransaction.find({ student: student._id, finePaid: false });
      let pendingFine = 0;
      allStudentTxs.forEach(tx => {
        if (tx.status === 'Returned') pendingFine += (tx.fineAmount || 0);
        else if (now > new Date(tx.expectedReturnDate)) pendingFine += calculateFine(tx.expectedReturnDate, now).fineAmount;
      });

      return res.json({
        success: true,
        isReloadOnly: true,
        student: {
          _id: student._id,
          fullName: student.fullName,
          enrollmentNumber: student.enrollmentNumber,
          photoUrl: student.photoUrl,
          department: student.department,
          semester: student.semester,
          division: student.division,
          nfcTagNumber: student.nfcTagNumber,
          email: student.email,
          mobileNumber: student.mobileNumber
        },
        currentBorrowedBooks,
        activeVisit,
        pendingFine
      });
    }

    // 4-SECOND THROTTLING CONCEPT PER STUDENT
    const nowMs = Date.now();
    const lastScanTime = studentScanThrottleMap.get(student._id.toString());
    if (lastScanTime && (nowMs - lastScanTime < 4000)) {
      const remainingSecs = Math.ceil((4000 - (nowMs - lastScanTime)) / 1000);
      console.log(`⏳ Throttle suppressed duplicate scan for ${student.fullName}. Wait ${remainingSecs}s.`);
      
      const activeVisit = await LibraryVisit.findOne({ student: student._id, status: { $in: ['Check-In', 'Inside Library'] } });
      return res.json({
        success: true,
        throttled: true,
        message: `⏳ Tap throttled for ${student.fullName}. Please wait 4 seconds before tapping again.`,
        student,
        activeVisit
      });
    }

    // Record tap timestamp for 4s throttling
    studentScanThrottleMap.set(student._id.toString(), nowMs);

    // TAP-IN (ENTRY) & TAP-OUT (EXIT) AUTOMATIC TOGGLE LOGIC
    let actionType = '';
    let actionMessage = '';

    let activeVisit = await LibraryVisit.findOne({
      student: student._id,
      status: { $in: ['Check-In', 'Inside Library'] }
    }).sort({ createdAt: -1 });

    if (activeVisit) {
      // 2ND TAP: EXIT LIBRARY (Check-Out)
      const exitTime = new Date();
      const entryTime = new Date(activeVisit.entryTime);
      const durationMinutes = Math.max(1, Math.round((exitTime - entryTime) / (1000 * 60)));

      activeVisit.exitTime = exitTime;
      activeVisit.durationMinutes = durationMinutes;
      activeVisit.status = 'Check-Out';
      await activeVisit.save();

      actionType = 'CHECKED_OUT';
      actionMessage = `🚪 ${student.fullName} checked OUT of Library (Stay duration: ${durationMinutes} mins)`;
      activeVisit = null;
    } else {
      // 1ST TAP: ENTER LIBRARY (Check-In)
      activeVisit = await LibraryVisit.create({
        student: student._id,
        nfcTagNumber: student.nfcTagNumber || cleanNfc,
        entryTime: new Date(),
        status: 'Check-In'
      });

      actionType = 'CHECKED_IN';
      actionMessage = `🟢 ${student.fullName} checked IN to Library`;
    }

    // Fetch active borrowed books
    const activeTransactions = await BookTransaction.find({
      student: student._id,
      status: { $in: ['Issued', 'Overdue'] }
    }).populate('book').sort({ issueDate: -1 });

    // Update overdue status dynamically
    const now = new Date();
    const currentBorrowedBooks = activeTransactions.map(tx => {
      const txObj = tx.toObject();
      if (now > new Date(tx.expectedReturnDate)) {
        txObj.status = 'Overdue';
        const { lateDays, fineAmount } = calculateFine(tx.expectedReturnDate, now);
        txObj.lateDays = lateDays;
        txObj.fineAmount = fineAmount;
      } else {
        txObj.lateDays = 0;
        txObj.fineAmount = 0;
      }
      return txObj;
    });

    // Calculate total pending fine
    const allStudentTxs = await BookTransaction.find({
      student: student._id,
      finePaid: false
    });

    let pendingFine = 0;
    allStudentTxs.forEach(tx => {
      if (tx.status === 'Returned') {
        pendingFine += (tx.fineAmount || 0);
      } else if (now > new Date(tx.expectedReturnDate)) {
        const { fineAmount } = calculateFine(tx.expectedReturnDate, now);
        pendingFine += fineAmount;
      }
    });

    // Emit live scan socket event if socket.io is initialized
    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:scanned', {
        student,
        activeVisit,
        actionType,
        actionMessage,
        currentBorrowedBooksCount: currentBorrowedBooks.length,
        pendingFine
      });
      io.emit('library:updated', { studentId: student._id, action: actionType });
    }

    res.json({
      success: true,
      actionType,
      message: actionMessage,
      student: {
        _id: student._id,
        fullName: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        photoUrl: student.photoUrl,
        department: student.department,
        semester: student.semester,
        division: student.division,
        nfcTagNumber: student.nfcTagNumber,
        email: student.email,
        mobileNumber: student.mobileNumber
      },
      currentBorrowedBooks,
      activeVisit,
      pendingFine
    });
  } catch (error) {
    console.error('Error in scanStudentNfc:', error);
    res.status(500).json({ message: error.message || 'Server error processing NFC tap' });
  }
};

// @desc    Check in student to library
// @route   POST /api/library/check-in
// @access  Private (Library Staff, Teacher, Admin)
const checkInStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is already inside
    const existingVisit = await LibraryVisit.findOne({
      student: student._id,
      status: { $in: ['Check-In', 'Inside Library'] }
    });

    if (existingVisit) {
      return res.status(400).json({ message: `${student.fullName} is already checked in to the library.` });
    }

    const visit = await LibraryVisit.create({
      student: student._id,
      nfcTagNumber: student.nfcTagNumber,
      entryTime: new Date(),
      status: 'Check-In'
    });

    const populatedVisit = await LibraryVisit.findById(visit._id).populate('student');

    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:visit_updated', populatedVisit);
      io.emit('library:updated', { studentId: student._id, action: 'checkIn' });
    }

    res.status(201).json({
      success: true,
      message: `${student.fullName} checked IN successfully.`,
      visit: populatedVisit
    });
  } catch (error) {
    console.error('Error in checkInStudent:', error);
    res.status(500).json({ message: error.message || 'Server error during check in' });
  }
};

// @desc    Check out student from library
// @route   POST /api/library/check-out
// @access  Private (Library Staff, Teacher, Admin)
const checkOutStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const visit = await LibraryVisit.findOne({
      student: student._id,
      status: { $in: ['Check-In', 'Inside Library'] }
    }).sort({ createdAt: -1 });

    if (!visit) {
      return res.status(400).json({ message: `No active check-in record found for ${student.fullName}.` });
    }

    const exitTime = new Date();
    const entryTime = new Date(visit.entryTime);
    const durationMinutes = Math.max(1, Math.round((exitTime - entryTime) / (1000 * 60)));

    visit.exitTime = exitTime;
    visit.durationMinutes = durationMinutes;
    visit.status = 'Check-Out';
    await visit.save();

    const populatedVisit = await LibraryVisit.findById(visit._id).populate('student');

    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:visit_updated', populatedVisit);
      io.emit('library:updated', { studentId: student._id, action: 'checkOut' });
    }

    res.json({
      success: true,
      message: `${student.fullName} checked OUT successfully (Duration: ${durationMinutes} mins).`,
      visit: populatedVisit
    });
  } catch (error) {
    console.error('Error in checkOutStudent:', error);
    res.status(500).json({ message: error.message || 'Server error during check out' });
  }
};

const sampleBooks = [
  // English (6)
  { title: 'Atomic Habits', author: 'James Clear', isbn: 'ENG-101', category: 'English', publisher: 'Avery', edition: '1st Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'ENG-A1', status: 'Available' },
  { title: 'The Alchemist', author: 'Paulo Coelho', isbn: 'ENG-102', category: 'English', publisher: 'HarperOne', edition: '25th Anniversary', totalCopies: 5, availableCopies: 5, shelfNumber: 'ENG-A2', status: 'Available' },
  { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', isbn: 'ENG-103', category: 'English', publisher: 'Plata Publishing', edition: '20th Anniversary', totalCopies: 5, availableCopies: 5, shelfNumber: 'ENG-A3', status: 'Available' },
  { title: 'The Psychology of Money', author: 'Morgan Housel', isbn: 'ENG-104', category: 'English', publisher: 'Harriman House', edition: '1st Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'ENG-A4', status: 'Available' },
  { title: "Harry Potter and the Philosopher's Stone", author: 'J.K. Rowling', isbn: 'ENG-105', category: 'English', publisher: 'Bloomsbury', edition: 'Special Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'ENG-A5', status: 'Available' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: 'ENG-106', category: 'English', publisher: 'George Allen & Unwin', edition: 'Collector Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'ENG-A6', status: 'Available' },

  // Hindi (6)
  { title: 'गोदान (Godaan)', author: 'मुंशी प्रेमचंद (Munshi Premchand)', isbn: 'HIN-201', category: 'Hindi', publisher: 'राजकमल प्रकाशन', edition: 'Standard Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'HIN-B1', status: 'Available' },
  { title: 'गुनाहों का देवता', author: 'धर्मवीर भारती (Dharamvir Bharati)', isbn: 'HIN-202', category: 'Hindi', publisher: 'भारतीय ज्ञानपीठ', edition: 'Revised Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'HIN-B2', status: 'Available' },
  { title: 'मधुशाला', author: 'हरिवंश राय बच्चन (Harivansh Rai Bachchan)', isbn: 'HIN-203', category: 'Hindi', publisher: 'राजपाल एंड संज', edition: 'Classic Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'HIN-B3', status: 'Available' },
  { title: 'राग दरबारी', author: 'श्रीलाल शुक्ल (Shrilal Shukla)', isbn: 'HIN-204', category: 'Hindi', publisher: 'राजकमल प्रकाशन', edition: 'Gold Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'HIN-B4', status: 'Available' },
  { title: 'चित्रलेखा', author: 'भगवती चरण वर्मा (Bhagwati Charan Verma)', isbn: 'HIN-205', category: 'Hindi', publisher: 'लोकभारती प्रकाशन', edition: '1st Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'HIN-B5', status: 'Available' },
  { title: 'भगवद्गीता', author: 'महर्षि वेदव्यास (Maharishi Ved Vyasa)', isbn: 'HIN-206', category: 'Hindi', publisher: 'गीताप्रेस गोरखपुर', edition: 'Deluxe Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'HIN-B6', status: 'Available' },

  // Gujarati (6)
  { title: 'સરસ્વતીચંદ્ર', author: 'ગોવર્ધનરામ ત્રિપાઠી (Govardhanram Tripathi)', isbn: 'GUJ-301', category: 'Gujarati', publisher: 'ગૂર્જર સાહિત્ય ભવન', edition: 'Heritage Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'GUJ-C1', status: 'Available' },
  { title: 'માનવીની ભવાઈ', author: 'પન્નાલાલ પટેલ (Pannalal Patel)', isbn: 'GUJ-302', category: 'Gujarati', publisher: 'સાહિત્ય અકાદમી', edition: 'Jnanpith Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'GUJ-C2', status: 'Available' },
  { title: 'મલેલા જીવ', author: 'પન્નાલાલ પટેલ (Pannalal Patel)', isbn: 'GUJ-303', category: 'Gujarati', publisher: 'આર. આર. શેઠ એન્ડ કંપની', edition: 'Special Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'GUJ-C3', status: 'Available' },
  { title: 'અંગળિયાત', author: 'જોસેફ મેકવાન (Joseph Macwan)', isbn: 'GUJ-304', category: 'Gujarati', publisher: 'ગૂર્જર સાહિત્ય ભવન', edition: '1st Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'GUJ-C4', status: 'Available' },
  { title: 'જીવનનું ઓડિટ', author: 'ગુણવંત શાહ (Gunvant Shah)', isbn: 'GUJ-305', category: 'Gujarati', publisher: 'આર. આર. શેઠ એન્ડ કંપની', edition: 'Popular Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'GUJ-C5', status: 'Available' },
  { title: 'ભગવદ ગીતા (ગુજરાતી)', author: 'મહર્ષિ વેદવ્યાસ (Maharishi Ved Vyasa)', isbn: 'GUJ-306', category: 'Gujarati', publisher: 'સસ્તુ સાહિત્ય વર્ધક કાર્યાલય', edition: 'Illustrated Edition', totalCopies: 5, availableCopies: 5, shelfNumber: 'GUJ-C6', status: 'Available' }
];

const seedSampleBooks = async () => {
  try {
    for (const b of sampleBooks) {
      await Book.updateOne({ isbn: b.isbn }, { $setOnInsert: b }, { upsert: true });
    }
  } catch (err) {
    console.error('Error seeding sample books:', err);
  }
};
seedSampleBooks();

// @desc    Get list of all books with search & filter
// @route   GET /api/library/books
// @access  Private
const getBooks = async (req, res) => {
  try {
    await seedSampleBooks();

    const { search, category, status } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { isbn: searchRegex },
        { category: searchRegex },
        { publisher: searchRegex },
        { shelfNumber: searchRegex }
      ];
    }

    const books = await Book.find(query).sort({ title: 1 });
    res.json({
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    console.error('Error in getBooks:', error);
    res.status(500).json({ message: error.message || 'Server error fetching books' });
  }
};

// @desc    Add a new book
// @route   POST /api/library/books
// @access  Private (Library Staff, Teacher, Admin)
const addBook = async (req, res) => {
  try {
    const { title, author, isbn, category, publisher, edition, totalCopies, shelfNumber } = req.body;

    if (!title || !author || !isbn || !category || !shelfNumber) {
      return res.status(400).json({ message: 'Title, Author, ISBN, Category, and Shelf Number are required.' });
    }

    const existingIsbn = await Book.findOne({ isbn: isbn.trim().toUpperCase() });
    if (existingIsbn) {
      return res.status(400).json({ message: `Book with ISBN ${isbn} already exists.` });
    }

    const copies = parseInt(totalCopies) || 1;

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim().toUpperCase(),
      category: category.trim(),
      publisher: publisher ? publisher.trim() : '',
      edition: edition ? edition.trim() : '1st Edition',
      totalCopies: copies,
      availableCopies: copies,
      shelfNumber: shelfNumber.trim(),
      status: copies > 0 ? 'Available' : 'Out of Stock'
    });

    res.status(201).json({
      success: true,
      message: 'Book added successfully to library catalog',
      book
    });
  } catch (error) {
    console.error('Error in addBook:', error);
    res.status(500).json({ message: error.message || 'Server error adding book' });
  }
};

// @desc    Update book details
// @route   PUT /api/library/books/:id
// @access  Private (Library Staff, Teacher, Admin)
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author, isbn, category, publisher, edition, totalCopies, availableCopies, shelfNumber, status } = req.body;

    if (isbn && isbn.trim().toUpperCase() !== book.isbn) {
      const existingIsbn = await Book.findOne({ isbn: isbn.trim().toUpperCase() });
      if (existingIsbn) {
        return res.status(400).json({ message: `Another book with ISBN ${isbn} already exists.` });
      }
      book.isbn = isbn.trim().toUpperCase();
    }

    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (category) book.category = category.trim();
    if (publisher !== undefined) book.publisher = publisher.trim();
    if (edition !== undefined) book.edition = edition.trim();
    if (shelfNumber) book.shelfNumber = shelfNumber.trim();
    if (totalCopies !== undefined) book.totalCopies = parseInt(totalCopies);
    if (availableCopies !== undefined) {
      book.availableCopies = parseInt(availableCopies);
      book.status = book.availableCopies > 0 ? 'Available' : 'Out of Stock';
    }
    if (status) book.status = status;

    await book.save();

    res.json({
      success: true,
      message: 'Book details updated successfully',
      book
    });
  } catch (error) {
    console.error('Error in updateBook:', error);
    res.status(500).json({ message: error.message || 'Server error updating book' });
  }
};

// @desc    Delete a book
// @route   DELETE /api/library/books/:id
// @access  Private (Library Staff, Teacher, Admin)
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check active issues
    const activeIssue = await BookTransaction.findOne({
      book: book._id,
      status: { $in: ['Issued', 'Overdue'] }
    });

    if (activeIssue) {
      return res.status(400).json({ message: 'Cannot delete book with active issued loans. Please ensure all copies are returned first.' });
    }

    await Book.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Book removed from library catalog'
    });
  } catch (error) {
    console.error('Error in deleteBook:', error);
    res.status(500).json({ message: error.message || 'Server error deleting book' });
  }
};

// @desc    Issue a book to a student
// @route   POST /api/library/issue-book
// @access  Private (Library Staff, Teacher, Admin)
const issueBook = async (req, res) => {
  try {
    const { studentId, bookId, expectedReturnDate } = req.body;

    if (!studentId || !bookId || !expectedReturnDate) {
      return res.status(400).json({ message: 'Student, Book, and Expected Return Date are required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.availableCopies <= 0 || book.status === 'Out of Stock') {
      return res.status(400).json({ message: `"${book.title}" is currently out of stock.` });
    }

    // Check if student already has an active issue for this exact book
    const existingIssue = await BookTransaction.findOne({
      student: student._id,
      book: book._id,
      status: { $in: ['Issued', 'Overdue'] }
    });

    if (existingIssue) {
      return res.status(400).json({ message: `${student.fullName} has already issued a copy of "${book.title}".` });
    }

    const transaction = await BookTransaction.create({
      book: book._id,
      student: student._id,
      nfcTagNumber: student.nfcTagNumber,
      issueDate: new Date(),
      expectedReturnDate: new Date(expectedReturnDate),
      issuedBy: req.user._id,
      status: 'Issued'
    });

    // Reduce available copies
    book.availableCopies -= 1;
    if (book.availableCopies === 0) {
      book.status = 'Out of Stock';
    }
    await book.save();

    const populatedTx = await BookTransaction.findById(transaction._id)
      .populate('book')
      .populate('student')
      .populate('issuedBy', 'username email');

    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:updated', { studentId: student._id, action: 'issueBook' });
    }

    res.status(201).json({
      success: true,
      message: `Book "${book.title}" issued successfully to ${student.fullName}.`,
      transaction: populatedTx
    });
  } catch (error) {
    console.error('Error in issueBook:', error);
    res.status(500).json({ message: error.message || 'Server error issuing book' });
  }
};

// @desc    Return a borrowed book
// @route   POST /api/library/return-book
// @access  Private (Library Staff, Teacher, Admin)
const returnBook = async (req, res) => {
  try {
    const { transactionId, finePaid } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required.' });
    }

    const transaction = await BookTransaction.findById(transactionId).populate('book').populate('student');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found' });
    }

    if (transaction.status === 'Returned') {
      return res.status(400).json({ message: 'This book transaction is already marked as returned.' });
    }

    const returnDate = new Date();
    const { lateDays, fineAmount } = calculateFine(transaction.expectedReturnDate, returnDate);

    transaction.returnDate = returnDate;
    transaction.lateDays = lateDays;
    transaction.fineAmount = fineAmount;
    if (finePaid !== undefined) {
      transaction.finePaid = !!finePaid;
    }
    transaction.returnedBy = req.user._id;
    transaction.status = 'Returned';
    await transaction.save();

    // Increase available copies
    if (transaction.book) {
      const book = await Book.findById(transaction.book._id);
      if (book) {
        book.availableCopies += 1;
        if (book.status === 'Out of Stock' && book.availableCopies > 0) {
          book.status = 'Available';
        }
        await book.save();
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:updated', { studentId: transaction.student ? transaction.student._id : null, action: 'returnBook' });
    }

    res.json({
      success: true,
      message: `Book "${transaction.book ? transaction.book.title : 'Book'}" returned successfully.${fineAmount > 0 ? ` Fine amount: ₹${fineAmount} (${lateDays} late days)` : ''}`,
      transaction
    });
  } catch (error) {
    console.error('Error in returnBook:', error);
    res.status(500).json({ message: error.message || 'Server error returning book' });
  }
};

// @desc    Pay fine for a returned or overdue book
// @route   PUT /api/library/transactions/:id/pay-fine
// @access  Private (Library Staff, Teacher, Admin)
const payFine = async (req, res) => {
  try {
    const transaction = await BookTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.finePaid = true;
    await transaction.save();

    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:updated', { studentId: transaction.student, action: 'payFine' });
    }

    res.json({
      success: true,
      message: 'Fine marked as PAID successfully.',
      transaction
    });
  } catch (error) {
    console.error('Error in payFine:', error);
    res.status(500).json({ message: error.message || 'Server error processing fine payment' });
  }
};

// @desc    Get Library Dashboard Summary Statistics & Active Lists
// @route   GET /api/library/dashboard-stats
// @access  Private (Library Staff, Teacher, Admin)
const getDashboardStats = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const books = await Book.find();

    const totalCopies = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const availableCopies = books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);

    const now = new Date();

    // Auto update overdue status for transactions past expectedReturnDate
    await BookTransaction.updateMany(
      { status: 'Issued', expectedReturnDate: { $lt: now } },
      { $set: { status: 'Overdue' } }
    );

    const totalIssued = await BookTransaction.countDocuments({ status: { $in: ['Issued', 'Overdue'] } });
    const totalOverdue = await BookTransaction.countDocuments({ status: 'Overdue' });

    // Students currently inside library
    const activeVisits = await LibraryVisit.find({ status: { $in: ['Check-In', 'Inside Library'] } }).populate('student').sort({ entryTime: -1 });

    // Recent transactions
    const recentTransactions = await BookTransaction.find()
      .populate('book')
      .populate('student')
      .populate('issuedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    // Overdue list
    const overdueTransactions = await BookTransaction.find({ status: 'Overdue' })
      .populate('book')
      .populate('student')
      .sort({ expectedReturnDate: 1 });

    const formattedOverdue = overdueTransactions.map(tx => {
      const txObj = tx.toObject();
      const { lateDays, fineAmount } = calculateFine(tx.expectedReturnDate, now);
      txObj.lateDays = lateDays;
      txObj.fineAmount = fineAmount;
      return txObj;
    });

    res.json({
      success: true,
      stats: {
        totalBooks,
        totalCopies,
        availableCopies,
        totalIssued,
        totalOverdue,
        insideLibraryCount: activeVisits.length
      },
      activeVisits,
      recentTransactions,
      overdueTransactions: formattedOverdue
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: error.message || 'Server error loading dashboard statistics' });
  }
};

// @desc    Get Student Personal Library View Data
// @route   GET /api/library/my-library
// @access  Private (Student, Coordinator)
const getStudentLibraryData = async (req, res) => {
  try {
    let student = await Student.findOne({ userId: req.user._id });

    if (!student && req.user.email) {
      student = await Student.findOne({ email: req.user.email.toLowerCase().trim() });
    }

    if (!student && req.user.username) {
      const uName = req.user.username.toLowerCase().trim();
      const uRegex = new RegExp(uName, 'i');
      student = await Student.findOne({
        $or: [
          { email: uName },
          { enrollmentNumber: uName.toUpperCase() },
          { nfcTagNumber: uName },
          { fullName: uRegex }
        ]
      });
    }

    if (!student) {
      student = await Student.findOne({
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      }).sort({ createdAt: -1 });
    }

    if (student && (!student.userId || student.userId.toString() !== req.user._id.toString())) {
      student.userId = req.user._id;
      await student.save();
    }

    if (!student) {
      return res.json({
        success: false,
        student: null,
        libraryVisits: [],
        currentBorrowedBooks: [],
        returnedBooks: [],
        totalFine: 0,
        message: 'Student profile not linked to your account. Please contact staff to register your student profile.'
      });
    }

    // Fetch library visits
    const libraryVisits = await LibraryVisit.find({ student: student._id }).sort({ entryTime: -1 });

    // Fetch transactions
    const transactions = await BookTransaction.find({ student: student._id }).populate('book').sort({ issueDate: -1 });

    const now = new Date();
    let totalFine = 0;

    const formattedTxs = transactions.map(tx => {
      const txObj = tx.toObject();
      if (tx.status === 'Issued' && now > new Date(tx.expectedReturnDate)) {
        txObj.status = 'Overdue';
        const { lateDays, fineAmount } = calculateFine(tx.expectedReturnDate, now);
        txObj.lateDays = lateDays;
        txObj.fineAmount = fineAmount;
      }
      if (!tx.finePaid) {
        totalFine += (txObj.fineAmount || 0);
      }
      return txObj;
    });

    const currentBorrowedBooks = formattedTxs.filter(t => t.status === 'Issued' || t.status === 'Overdue');
    const returnedBooks = formattedTxs.filter(t => t.status === 'Returned');

    res.json({
      success: true,
      student,
      libraryVisits,
      currentBorrowedBooks,
      returnedBooks,
      totalTransactions: formattedTxs,
      totalFine
    });
  } catch (error) {
    console.error('Error in getStudentLibraryData:', error);
    res.status(500).json({ message: error.message || 'Server error loading student library history' });
  }
};

// @desc    Clear all library visit records (Wipe messy test data)
// @route   DELETE /api/library/clear-visits
// @access  Private
const clearVisits = async (req, res) => {
  try {
    await LibraryVisit.deleteMany({});
    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:updated', { action: 'clearVisits' });
      io.emit('library:visit_updated');
    }
    res.json({ success: true, message: 'All test library visit logs cleared successfully.' });
  } catch (error) {
    console.error('Error clearing visits:', error);
    res.status(500).json({ message: error.message || 'Server error clearing visits' });
  }
};

// Purge messy test visits automatically on server startup once
(async () => {
  try {
    await LibraryVisit.deleteMany({});
    console.log('🧹 Purged all old messy test library visit logs from database.');
  } catch (err) {
    console.error('Error purging old test visits:', err);
  }
})();

// @desc    Delete a specific library visit record
// @route   DELETE /api/library/visits/:id
// @access  Private (Library Staff, Teacher, Admin)
const deleteVisit = async (req, res) => {
  try {
    const visit = await LibraryVisit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ message: 'Visit record not found' });
    }

    await LibraryVisit.findByIdAndDelete(req.params.id);

    const io = req.app.get('socketio');
    if (io) {
      io.emit('library:visit_updated');
      io.emit('library:updated');
    }

    res.json({ success: true, message: 'Visit record deleted successfully' });
  } catch (error) {
    console.error('Error deleting visit record:', error);
    res.status(500).json({ message: error.message || 'Server error deleting visit record' });
  }
};

module.exports = {
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
};
