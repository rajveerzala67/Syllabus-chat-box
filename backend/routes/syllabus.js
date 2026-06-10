const express = require('express');
const router = express.Router();
const Syllabus = require('../models/Syllabus');
const { protect, requireRole } = require('../middleware/auth');

// @route   GET /api/syllabus
// @desc    Get all syllabus updates
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const syllabusList = await Syllabus.find().sort({ date: -1, createdAt: -1 });
    res.json(syllabusList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/syllabus
// @desc    Add a syllabus update
// @access  Private (Coordinator Only)
router.post('/', protect, requireRole('coordinator'), async (req, res) => {
  const { subjectName, facultyName, date, time, topic } = req.body;

  if (!subjectName || !facultyName || !date || !time || !topic) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newSyllabus = new Syllabus({
      subjectName,
      facultyName,
      date,
      time,
      topic,
      createdBy: req.user.id
    });

    const savedSyllabus = await newSyllabus.save();
    res.status(201).json(savedSyllabus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/syllabus/:id
// @desc    Delete a syllabus update
// @access  Private (Coordinator Only)
router.delete('/:id', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const syllabusItem = await Syllabus.findById(req.params.id);
    if (!syllabusItem) {
      return res.status(404).json({ message: 'Syllabus record not found' });
    }

    await Syllabus.findByIdAndDelete(req.params.id);
    res.json({ message: 'Syllabus update removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
