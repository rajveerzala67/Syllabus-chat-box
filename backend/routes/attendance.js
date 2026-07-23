const express = require('express');
const router = express.Router();
const { protect, teacherOnly } = require('../middleware/auth');
const {
  scanNfcCard,
  getSessionScans,
  getTeacherAttendanceReports,
  getStudentAttendanceDashboard
} = require('../controllers/attendanceController');

router.post('/scan-nfc', protect, teacherOnly, scanNfcCard);
router.get('/session/:sessionId', protect, teacherOnly, getSessionScans);
router.get('/reports', protect, teacherOnly, getTeacherAttendanceReports);
router.get('/my-attendance', protect, getStudentAttendanceDashboard);

module.exports = router;
