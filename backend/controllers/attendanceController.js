const Student = require('../models/Student');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');

// @desc    Process real-time NFC Card scan tap
// @route   POST /api/attendance/scan-nfc
// @access  Private (Teachers/Coordinators only)
const scanNfcCard = async (req, res) => {
  return res.status(400).json({
    message: 'NFC Attendance workflow has been migrated to NFC Library Management. Attendance module is reserved for future AI Face Recognition integration.'
  });
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

    // Fallback: If no direct match, check for unlinked student profile in DB
    if (!student) {
      student = await Student.findOne({
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      }).sort({ createdAt: -1 });
    }

    // Auto-link profile if student found
    if (student && (!student.userId || student.userId.toString() !== req.user._id.toString())) {
      student.userId = req.user._id;
      await student.save();
    }

    if (!student) {
      return res.json({
        success: false,
        student: null,
        overallPercentage: 0,
        totalLecturesCount: 0,
        totalPresentCount: 0,
        subjectBreakdown: [],
        lectureHistory: [],
        message: 'Student profile not linked to your user account. Please ask teacher to register your student profile.'
      });
    }

    // Flexible Semester & Division regex matching
    const semVal = student.semester ? student.semester.toString().trim() : '5';
    const divVal = student.division ? student.division.toString().trim() : 'A';

    // Total lectures for student's semester & division
    const totalLectures = await Lecture.find({
      semester: { $in: [semVal, parseInt(semVal) || 5, semVal.toString()] },
      division: new RegExp(`^${divVal}$`, 'i')
    }).populate('createdBy', 'username email').sort({ date: -1 });

    // Student's present attendance records
    const presentRecords = await Attendance.find({
      student: student._id
    }).populate('lecture').populate('session').sort({ scannedAt: -1 });

    const presentLectureIds = new Set(
      presentRecords
        .map(r => r.lecture ? r.lecture._id.toString() : (r.session ? r.session.toString() : ''))
        .filter(Boolean)
    );

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
      ? Math.min(100, Math.round((totalPresentCount / totalLecturesCount) * 100))
      : 100;

    // Build combined history including permanent present records for deleted/past lectures
    const historyMap = new Map();

    totalLectures.forEach(lec => {
      const isPresent = presentLectureIds.has(lec._id.toString());
      historyMap.set(lec._id.toString(), {
        _id: lec._id,
        subject: lec.subject,
        date: lec.date,
        startTime: lec.startTime,
        endTime: lec.endTime,
        room: lec.room,
        teacherName: lec.createdBy ? lec.createdBy.username : 'Teacher',
        status: isPresent ? 'Present' : 'Absent'
      });
    });

    // Add permanent attendance records (even if lecture schedule was deleted or auto-cleared)
    presentRecords.forEach(rec => {
      const key = rec.lecture ? rec.lecture._id.toString() : rec._id.toString();
      if (!historyMap.has(key)) {
        historyMap.set(key, {
          _id: rec._id,
          subject: rec.subject || (rec.lecture ? rec.lecture.subject : 'Class Lecture'),
          date: rec.lectureDate || rec.scannedAt,
          startTime: rec.startTime || (rec.lecture ? rec.lecture.startTime : 'Session'),
          endTime: rec.endTime || (rec.lecture ? rec.lecture.endTime : ''),
          room: rec.room || (rec.lecture ? rec.lecture.room : 'Lab'),
          teacherName: rec.teacherName || 'Teacher',
          status: 'Present'
        });
      }
    });

    const lectureHistory = Array.from(historyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

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
