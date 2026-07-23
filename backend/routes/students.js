const express = require('express');
const router = express.Router();
const { protect, teacherOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createStudent,
  getStudents,
  getStudentById,
  getStudentByNfc,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

// Router endpoints protected for logged in teachers / coordinators
router.route('/')
  .post(protect, teacherOnly, upload.single('photo'), createStudent)
  .get(protect, teacherOnly, getStudents);

router.route('/nfc/:nfcTagOrEnrollment')
  .get(protect, teacherOnly, getStudentByNfc);

router.route('/:id')
  .get(protect, teacherOnly, getStudentById)
  .put(protect, teacherOnly, upload.single('photo'), updateStudent)
  .delete(protect, teacherOnly, deleteStudent);

module.exports = router;
