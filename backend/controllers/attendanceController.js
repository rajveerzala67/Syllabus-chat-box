const Student = require('../models/Student');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');

// @desc    Process real-time NFC Card scan tap
// @route   POST /api/attendance/scan-nfc
// @access  Private (Teachers/Coordinators only)
const scanNfcCard = async (req, res) => {
  try {
    const { nfcCardNumber, sessionId } = req.body;

    if (!nfcCardNumber || !sessionId) {
      return res.status(400).json({ message: 'NFC Card Number and Session ID are required.' });
    }

    const cleanNfc = nfcCardNumber.trim();

    // 1. Verify Active Attendance Session
    const session = await AttendanceSession.findById(sessionId).populate('lecture');
    if (!session || session.status !== 'Active') {
      return res.status(400).json({ message: 'Attendance Session Closed.' });
    }

    // 2. Verify Attendance Window Time
    const now = new Date();
    if (now > new Date(session.attendanceEnd)) {
      // Auto close session if expired
      session.status = 'Closed';
      await session.save();
      if (session.lecture) {
        session.lecture.isAttendanceWindowOpen = false;
        await session.lecture.save();
      }
      return res.status(400).json({ message: 'Attendance Window Closed.' });
    }

    // 3. Search Student by NFC Tag Number or Enrollment Number
    const student = await Student.findOne({
      $or: [
        { nfcTagNumber: cleanNfc },
        { enrollmentNumber: cleanNfc.toUpperCase() }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: 'Invalid NFC Card. Card is not registered.' });
    }

    // 4. Verify Semester & Division Match
    if (
      student.semester.toString().trim() !== session.semester.toString().trim() ||
      student.division.trim().toUpperCase() !== session.division.trim().toUpperCase()
    ) {
      return res.status(400).json({
        message: `Student belongs to Division ${student.division} (Semester ${student.semester}), not Division ${session.division}!`
      });
    }

    // 5. Check Duplicate Attendance Scan
    const existingScan = await Attendance.findOne({
      session: session._id,
      student: student._id
    });

    if (existingScan) {
      return res.status(400).json({
        message: `Attendance Already Marked for ${student.fullName} (${student.enrollmentNumber}).`
      });
    }

    // 6. Create Attendance Record in MongoDB
    const attendance = await Attendance.create({
      session: session._id,
      lecture: session.lecture._id || session.lecture,
      student: student._id,
      nfcTagNumber: student.nfcTagNumber,
      semester: student.semester,
      division: student.division,
      scannedAt: now,
      status: 'Present'
    });

    // Formatted payload for real-time Socket.IO & HTTP response
    const scanData = {
      _id: attendance._id,
      student: {
        _id: student._id,
        fullName: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        photoUrl: student.photoUrl,
        department: student.department,
        semester: student.semester,
        division: student.division,
        nfcTagNumber: student.nfcTagNumber
      },
      subject: session.subject,
      scannedAt: attendance.scannedAt,
      status: 'Present'
    };

    // Emit real-time Socket.IO broadcast to active scanner clients
    const io = req.app.get('socketio');
    if (io) {
      io.to(session._id.toString()).emit('nfc:scanned', scanData);
    }

    res.status(200).json({
      success: true,
      message: 'Attendance Marked Successfully',
      student: scanData.student,
      subject: session.subject,
      scannedAt: attendance.scannedAt
    });
  } catch (error) {
    console.error('Error in scanNfcCard:', error);
    res.status(500).json({ message: error.message || 'Server error processing NFC tap scan' });
  }
};

// @desc    Get live scanned students for an active session
// @route   GET /api/attendance/session/:sessionId
// @access  Private (Teachers/Coordinators only)
const getSessionScans = async (req, res) => {
  try {
    const scans = await Attendance.find({ session: req.params.sessionId })
      .populate('student')
      .sort({ scannedAt: -1 });

    res.json({
      success: true,
      count: scans.length,
      scans
    });
  } catch (error) {
    console.error('Error in getSessionScans:', error);
    res.status(500).json({ message: error.message || 'Server error fetching session scans' });
  }
};

// @desc    Get Teacher Attendance Reports, Filters, & Analytics
// @route   GET /api/attendance/reports
// @access  Private (Teachers/Coordinators only)
const getTeacherAttendanceReports = async (req, res) => {
  try {
    const { search, department, semester, division, subject, date } = req.query;

    const query = {};

    if (semester) query.semester = semester.toString().trim();
    if (division) query.division = division.trim().toUpperCase();

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.scannedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('student')
      .populate('lecture')
      .populate('session')
      .sort({ scannedAt: -1 });

    // Client-side / server-side filtered records
    let filteredRecords = attendanceRecords;

    if (subject && subject.trim() !== '') {
      const subjectRegex = new RegExp(subject.trim(), 'i');
      filteredRecords = filteredRecords.filter(r => 
        (r.session && subjectRegex.test(r.session.subject)) ||
        (r.lecture && subjectRegex.test(r.lecture.subject))
      );
    }

    if (department && department.trim() !== '') {
      filteredRecords = filteredRecords.filter(r => 
        r.student && r.student.department === department.trim()
      );
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filteredRecords = filteredRecords.filter(r => 
        r.student && (
          searchRegex.test(r.student.fullName) ||
          searchRegex.test(r.student.enrollmentNumber) ||
          searchRegex.test(r.student.email) ||
          searchRegex.test(r.student.nfcTagNumber)
        )
      );
    }

    res.json({
      success: true,
      totalPresent: filteredRecords.length,
      records: filteredRecords
    });
  } catch (error) {
    console.error('Error in getTeacherAttendanceReports:', error);
    res.status(500).json({ message: error.message || 'Server error generating attendance reports' });
  }
};

// @desc    Get Student Personal Attendance Dashboard Data
// @route   GET /api/attendance/my-attendance
// @access  Private (Students only)
const getStudentAttendanceDashboard = async (req, res) => {
  try {
    // Find Student profile linked to logged in user
    let student = await Student.findOne({ userId: req.user._id });
    if (!student && req.user.email) {
      student = await Student.findOne({ email: req.user.email.toLowerCase().trim() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student profile not linked to your user account.' });
    }

    // Total lectures for student's semester & division
    const totalLectures = await Lecture.find({
      semester: student.semester,
      division: student.division
    }).sort({ date: -1 });

    // Student's present attendance records
    const presentRecords = await Attendance.find({
      student: student._id
    }).populate('lecture').populate('session').sort({ scannedAt: -1 });

    const presentLectureIds = new Set(presentRecords.map(r => r.lecture ? r.lecture._id.toString() : ''));

    // Subject-wise percentage calculation
    const subjectStats = {};
    totalLectures.forEach(lec => {
      const sub = lec.subject;
      if (!subjectStats[sub]) {
        subjectStats[sub] = { total: 0, present: 0 };
      }
      subjectStats[sub].total += 1;
      if (presentLectureIds.has(lec._id.toString())) {
        subjectStats[sub].present += 1;
      }
    });

    const subjectBreakdown = Object.keys(subjectStats).map(subject => {
      const { total, present } = subjectStats[subject];
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return { subject, total, present, percentage };
    });

    const totalLecturesCount = totalLectures.length;
    const totalPresentCount = presentRecords.length;
    const overallPercentage = totalLecturesCount > 0 
      ? Math.round((totalPresentCount / totalLecturesCount) * 100) 
      : 100;

    // Monthly present/absent log
    const lectureHistory = totalLectures.map(lec => {
      const isPresent = presentLectureIds.has(lec._id.toString());
      return {
        _id: lec._id,
        subject: lec.subject,
        date: lec.date,
        startTime: lec.startTime,
        endTime: lec.endTime,
        room: lec.room,
        status: isPresent ? 'Present' : 'Absent'
      };
    });

    res.json({
      success: true,
      student,
      overallPercentage,
      totalLecturesCount,
      totalPresentCount,
      subjectBreakdown,
      lectureHistory
    });
  } catch (error) {
    console.error('Error in getStudentAttendanceDashboard:', error);
    res.status(500).json({ message: error.message || 'Server error loading student attendance dashboard' });
  }
};

module.exports = {
  scanNfcCard,
  getSessionScans,
  getTeacherAttendanceReports,
  getStudentAttendanceDashboard
};
