const Lecture = require('../models/Lecture');
const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');

// @desc    Schedule a new lecture
// @route   POST /api/lectures
// @access  Private (Teachers/Coordinators only)
const createLecture = async (req, res) => {
  try {
    const {
      subject,
      semester,
      division,
      room,
      lectureNumber,
      date,
      startTime,
      endTime,
      attendanceWindowMinutes
    } = req.body;

    if (!subject || !semester || !division || !room || !lectureNumber || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'All lecture schedule details are required.' });
    }

    const lecture = await Lecture.create({
      subject: subject.trim(),
      semester: semester.toString().trim(),
      division: division.trim().toUpperCase(),
      room: room.trim(),
      lectureNumber: lectureNumber.toString().trim(),
      date: new Date(date),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      attendanceWindowMinutes: attendanceWindowMinutes ? Number(attendanceWindowMinutes) : 10,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Lecture scheduled successfully!',
      lecture
    });
  } catch (error) {
    console.error('Error in createLecture:', error);
    res.status(500).json({ message: error.message || 'Server error scheduling lecture' });
  }
};

// Utility to auto-delete lectures from past days (midnight cleanup)
const cleanupExpiredLectures = async () => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const expiredLectures = await Lecture.find({ date: { $lt: startOfToday } });
    if (expiredLectures.length > 0) {
      const expiredIds = expiredLectures.map(l => l._id);
      await Lecture.deleteMany({ _id: { $in: expiredIds } });
      await AttendanceSession.deleteMany({ lecture: { $in: expiredIds } });
      // NOTE: Attendance records are kept permanently in DB so student attendance history is never lost!
      console.log(`🧹 Midnight Auto-Cleanup: Removed ${expiredLectures.length} past lecture schedule(s) from DB (Attendance logs preserved).`);
    }
  } catch (err) {
    console.error('Error in cleanupExpiredLectures:', err);
  }
};

// @desc    Get lectures categorized by Today's, Upcoming, and Completed
// @route   GET /api/lectures
// @access  Private (Teachers/Coordinators/Students)
const getLectures = async (req, res) => {
  try {
    // Run midnight cleanup on get lectures
    await cleanupExpiredLectures();

    const { semester, division } = req.query;

    const query = {};
    if (semester) query.semester = semester.toString().trim();
    if (division) query.division = division.trim().toUpperCase();

    // If logged in user is teacher, filter by createdBy unless admin
    if (req.user.role === 'teacher' || req.user.role === 'coordinator') {
      query.createdBy = req.user._id;
    }

    const allLectures = await Lecture.find(query).sort({ date: 1, startTime: 1 });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayLectures = [];
    const upcomingLectures = [];
    const completedLectures = [];

    allLectures.forEach(l => {
      const lecDate = new Date(l.date);
      if (lecDate >= startOfToday && lecDate <= endOfToday) {
        todayLectures.push(l);
      } else if (lecDate > endOfToday) {
        upcomingLectures.push(l);
      } else {
        completedLectures.push(l);
      }
    });

    res.json({
      success: true,
      todayLectures,
      upcomingLectures,
      completedLectures
    });
  } catch (error) {
    console.error('Error in getLectures:', error);
    res.status(500).json({ message: error.message || 'Server error fetching lectures' });
  }
};

// @desc    Start Attendance Session for a Lecture
// @route   POST /api/lectures/:id/start-session
// @access  Private (Teachers/Coordinators only)
const startAttendanceSession = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found.' });
    }

    const windowMinutes = lecture.attendanceWindowMinutes || 10;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);

    // Create or update active attendance session
    let session = await AttendanceSession.findOne({ lecture: lecture._id, status: 'Active' });

    if (!session) {
      session = await AttendanceSession.create({
        lecture: lecture._id,
        teacher: req.user._id,
        subject: lecture.subject,
        semester: lecture.semester,
        division: lecture.division,
        room: lecture.room,
        date: lecture.date,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        attendanceStart: now,
        attendanceEnd: windowEnd,
        status: 'Active'
      });
    } else {
      session.attendanceEnd = windowEnd;
      session.status = 'Active';
      await session.save();
    }

    lecture.isAttendanceWindowOpen = true;
    await lecture.save();

    res.json({
      success: true,
      message: `Attendance Session started! NFC Scanner open for ${windowMinutes} minutes.`,
      session,
      windowEndTime: session.attendanceEnd
    });
  } catch (error) {
    console.error('Error in startAttendanceSession:', error);
    res.status(500).json({ message: error.message || 'Server error starting attendance session' });
  }
};

// @desc    Reopen Attendance Window manually
// @route   PUT /api/lectures/:id/reopen-session
// @access  Private (Teachers/Coordinators only)
const reopenAttendanceWindow = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found.' });
    }

    const extensionMinutes = req.body.minutes ? Number(req.body.minutes) : 10;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + extensionMinutes * 60 * 1000);

    let session = await AttendanceSession.findOne({ lecture: lecture._id }).sort({ createdAt: -1 });

    if (!session) {
      session = await AttendanceSession.create({
        lecture: lecture._id,
        teacher: req.user._id,
        subject: lecture.subject,
        semester: lecture.semester,
        division: lecture.division,
        room: lecture.room,
        date: lecture.date,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        attendanceStart: now,
        attendanceEnd: windowEnd,
        status: 'Active'
      });
    } else {
      session.attendanceEnd = windowEnd;
      session.status = 'Active';
      await session.save();
    }

    lecture.isAttendanceWindowOpen = true;
    await lecture.save();

    res.json({
      success: true,
      message: `Attendance window reopened for ${extensionMinutes} minutes.`,
      session
    });
  } catch (error) {
    console.error('Error in reopenAttendanceWindow:', error);
    res.status(500).json({ message: error.message || 'Server error reopening attendance window' });
  }
};

// @desc    Close Attendance Session
// @route   PUT /api/lectures/:id/close-session
// @access  Private (Teachers/Coordinators only)
const closeAttendanceSession = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found.' });
    }

    await AttendanceSession.updateMany(
      { lecture: lecture._id, status: 'Active' },
      { status: 'Closed' }
    );

    lecture.isAttendanceWindowOpen = false;
    await lecture.save();

    res.json({
      success: true,
      message: 'Attendance session closed successfully.'
    });
  } catch (error) {
    console.error('Error in closeAttendanceSession:', error);
    res.status(500).json({ message: error.message || 'Server error closing attendance session' });
  }
};

// @desc    Delete a Lecture permanently from DB along with sessions & attendance records
// @route   DELETE /api/lectures/:id
// @access  Private (Teachers/Coordinators only)
const deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found.' });
    }

    // Permanently remove Lecture and Sessions (Keep Attendance records permanently!)
    await Lecture.findByIdAndDelete(req.params.id);
    await AttendanceSession.deleteMany({ lecture: req.params.id });

    res.json({
      success: true,
      message: 'Lecture schedule deleted. Marked student attendance records are preserved permanently.'
    });
  } catch (error) {
    console.error('Error in deleteLecture:', error);
    res.status(500).json({ message: error.message || 'Server error deleting lecture' });
  }
};

module.exports = {
  createLecture,
  getLectures,
  startAttendanceSession,
  reopenAttendanceWindow,
  closeAttendanceSession,
  deleteLecture,
  cleanupExpiredLectures
};
