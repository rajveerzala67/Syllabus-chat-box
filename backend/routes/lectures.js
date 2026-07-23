const express = require('express');
const router = express.Router();
const { protect, teacherOnly } = require('../middleware/auth');
const {
  createLecture,
  getLectures,
  startAttendanceSession,
  reopenAttendanceWindow,
  closeAttendanceSession
} = require('../controllers/lectureController');

router.route('/')
  .post(protect, teacherOnly, createLecture)
  .get(protect, getLectures);

router.route('/:id/start-session')
  .post(protect, teacherOnly, startAttendanceSession);

router.route('/:id/reopen-session')
  .put(protect, teacherOnly, reopenAttendanceWindow);

router.route('/:id/close-session')
  .put(protect, teacherOnly, closeAttendanceSession);

module.exports = router;
