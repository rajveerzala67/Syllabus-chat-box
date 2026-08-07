const Student = require('../models/Student');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Register a new student & auto-generate login user account
// @route   POST /api/students
// @access  Private (Teachers/Coordinators only)
const createStudent = async (req, res) => {
  try {
    const {
      enrollmentNumber,
      fullName,
      email,
      mobileNumber,
      department,
      semester,
      division,
      academicYear,
      gender,
      dateOfBirth,
      address,
      nfcTagNumber
    } = req.body;

    // Validate required text fields
    if (
      !enrollmentNumber ||
      !fullName ||
      !email ||
      !mobileNumber ||
      !department ||
      !semester ||
      !division ||
      !academicYear ||
      !gender ||
      !dateOfBirth ||
      !address ||
      !nfcTagNumber
    ) {
      return res.status(400).json({ message: 'All student details are required.' });
    }

    // Validate photo upload
    if (!req.file) {
      return res.status(400).json({ message: 'Passport size photo image is required.' });
    }

    const formattedEnrollment = enrollmentNumber.trim().toUpperCase();
    const formattedNfc = nfcTagNumber.trim();
    const studentEmail = email.trim().toLowerCase();

    // Check duplicate Enrollment Number
    const existingEnrollment = await Student.findOne({ enrollmentNumber: formattedEnrollment });
    if (existingEnrollment) {
      return res.status(400).json({ message: `Enrollment Number '${formattedEnrollment}' is already registered.` });
    }

    // Check duplicate NFC Tag Number
    const existingNfc = await Student.findOne({ nfcTagNumber: formattedNfc });
    if (existingNfc) {
      return res.status(400).json({ message: `NFC Tag Number '${formattedNfc}' is already assigned to another student.` });
    }

    // Check duplicate Email Address
    const existingEmail = await Student.findOne({ email: studentEmail });
    if (existingEmail) {
      return res.status(400).json({ message: `Email address '${studentEmail}' is already registered to another student.` });
    }

    // Upload photo to Cloudinary (or local fallback)
    const mimeType = req.file ? req.file.mimetype : 'image/jpeg';
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'student_photos', mimeType);

    // Secure random temporary password (e.g. SOU-482915)
    const tempPassword = `SOU-${Math.floor(100000 + Math.random() * 900000)}`;

    // Check if a User account already exists for this student by username or email
    let userAccount = await User.findOne({
      $or: [
        { username: studentEmail },
        { email: studentEmail },
        { username: formattedEnrollment.toLowerCase() }
      ]
    });

    if (!userAccount) {
      userAccount = await User.create({
        username: studentEmail,
        email: studentEmail,
        password: tempPassword,
        role: 'student',
        mustChangePassword: true
      });
    } else {
      userAccount.mustChangePassword = true;
      await userAccount.save();
    }

    // Create student profile in MongoDB
    const student = await Student.create({
      enrollmentNumber: formattedEnrollment,
      fullName: fullName.trim(),
      email: studentEmail,
      mobileNumber: mobileNumber.trim(),
      department: department.trim(),
      semester: semester.toString().trim(),
      division: division.trim().toUpperCase(),
      academicYear: academicYear.trim(),
      gender,
      dateOfBirth: new Date(dateOfBirth),
      address: address.trim(),
      photoUrl: cloudinaryResult.url,
      photoPublicId: cloudinaryResult.public_id,
      nfcTagNumber: formattedNfc,
      userId: userAccount._id,
      createdBy: req.user._id
    });

    // Link studentProfile back to User
    userAccount.studentProfile = student._id;
    await userAccount.save();

    res.status(201).json({
      success: true,
      message: `Student profile & login account created! Temporary password is '${tempPassword}'.`,
      student,
      credentials: {
        email: studentEmail,
        tempPassword
      }
    });
  } catch (error) {
    console.error('Error in createStudent:', error);
    res.status(500).json({ message: error.message || 'Server error creating student record' });
  }
};

// @desc    Get all students with search & filter parameters
// @route   GET /api/students
// @access  Private (Teachers/Coordinators only)
const getStudents = async (req, res) => {
  try {
    const { search, department, semester, division } = req.query;

    const query = {};

    // Filter by Department
    if (department && department.trim() !== '') {
      query.department = department.trim();
    }

    // Filter by Semester
    if (semester && semester.trim() !== '') {
      query.semester = semester.trim();
    }

    // Filter by Division
    if (division && division.trim() !== '') {
      query.division = division.trim().toUpperCase();
    }

    // Search by Enrollment Number or Full Name
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { enrollmentNumber: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
        { nfcTagNumber: searchRegex }
      ];
    }

    const students = await Student.find(query)
      .populate('createdBy', 'username email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    console.error('Error in getStudents:', error);
    res.status(500).json({ message: error.message || 'Server error fetching student records' });
  }
};

// @desc    Get student by Mongo ID
// @route   GET /api/students/:id
// @access  Private (Teachers/Coordinators only)
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('createdBy', 'username email role');
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }
    res.json({ success: true, student });
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({ message: error.message || 'Server error fetching student details' });
  }
};

// @desc    Search student by NFC Tag Number or Enrollment Number (for NFC Attendance & AI Verification)
// @route   GET /api/students/nfc/:nfcTagOrEnrollment
// @access  Private (Teachers/Coordinators only)
const getStudentByNfc = async (req, res) => {
  try {
    const key = req.params.nfcTagOrEnrollment.trim();
    const student = await Student.findOne({
      $or: [
        { nfcTagNumber: key },
        { enrollmentNumber: key.toUpperCase() }
      ]
    }).populate('createdBy', 'username email role');

    if (!student) {
      return res.status(404).json({ message: 'Student record not found for this NFC Tag / Enrollment Number.' });
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error('Error in getStudentByNfc:', error);
    res.status(500).json({ message: error.message || 'Server error scanning student record' });
  }
};

// @desc    Update student record & replace Cloudinary photo if uploaded
// @route   PUT /api/students/:id
// @access  Private (Teachers/Coordinators only)
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const {
      enrollmentNumber,
      fullName,
      email,
      mobileNumber,
      department,
      semester,
      division,
      academicYear,
      gender,
      dateOfBirth,
      address,
      nfcTagNumber
    } = req.body;

    // Check duplicate Enrollment Number if modified
    if (enrollmentNumber && enrollmentNumber.trim().toUpperCase() !== student.enrollmentNumber) {
      const formattedEnrollment = enrollmentNumber.trim().toUpperCase();
      const existingEnrollment = await Student.findOne({ enrollmentNumber: formattedEnrollment });
      if (existingEnrollment) {
        return res.status(400).json({ message: `Enrollment Number '${formattedEnrollment}' is already registered by another student.` });
      }
      student.enrollmentNumber = formattedEnrollment;
    }

    // Check duplicate NFC Tag Number if modified
    if (nfcTagNumber && nfcTagNumber.trim() !== student.nfcTagNumber) {
      const formattedNfc = nfcTagNumber.trim();
      const existingNfc = await Student.findOne({ nfcTagNumber: formattedNfc });
      if (existingNfc) {
        return res.status(400).json({ message: `NFC Tag Number '${formattedNfc}' is already assigned to another student.` });
      }
      student.nfcTagNumber = formattedNfc;
    }

    // Handle optional Photo replacement
    if (req.file) {
      // 1. Delete previous image from Cloudinary
      if (student.photoPublicId) {
        await deleteFromCloudinary(student.photoPublicId);
      }
      // 2. Upload new image to Cloudinary (or local fallback)
      const mimeType = req.file.mimetype || 'image/jpeg';
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'student_photos', mimeType);
      student.photoUrl = cloudinaryResult.url;
      student.photoPublicId = cloudinaryResult.public_id;
    }

    // Update other fields
    if (fullName) student.fullName = fullName.trim();
    if (email) student.email = email.trim().toLowerCase();
    if (mobileNumber) student.mobileNumber = mobileNumber.trim();
    if (department) student.department = department.trim();
    if (semester) student.semester = semester.toString().trim();
    if (division) student.division = division.trim().toUpperCase();
    if (academicYear) student.academicYear = academicYear.trim();
    if (gender) student.gender = gender;
    if (dateOfBirth) student.dateOfBirth = new Date(dateOfBirth);
    if (address) student.address = address.trim();

    await student.save();

    res.json({
      success: true,
      message: 'Student details updated successfully!',
      student
    });
  } catch (error) {
    console.error('Error in updateStudent:', error);
    res.status(500).json({ message: error.message || 'Server error updating student record' });
  }
};

// @desc    Delete student record & destroy Cloudinary photo
// @route   DELETE /api/students/:id
// @access  Private (Teachers/Coordinators only)
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    // Delete photo from Cloudinary
    if (student.photoPublicId) {
      await deleteFromCloudinary(student.photoPublicId);
    }

    // Delete record from MongoDB
    await student.deleteOne();

    res.json({
      success: true,
      message: 'Student record and photo deleted successfully.'
    });
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    res.status(500).json({ message: error.message || 'Server error deleting student record' });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  getStudentByNfc,
  updateStudent,
  deleteStudent
};
