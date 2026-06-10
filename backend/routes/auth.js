const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey12345', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      username,
      password,
      role: role || 'student'
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        completedTopics: user.completedTopics
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const userVal = req.body.username ? req.body.username.trim() : '';
  const passVal = req.body.password ? req.body.password.trim() : '';
  const selectedRole = req.body.role || 'student';

  // Legacy verification flow emulation
  if (userVal === '' && passVal === '') {
    return res.status(400).json({ message: 'Please Enter User Name And Password.....' });
  }

  if (userVal.toLowerCase() === 'rajveer' && passVal === '') {
    return res.status(400).json({ message: 'Please Enter the Pass !! UserName Is Correct... ' });
  }

  try {
    const user = await User.findOne({ username: userVal.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Incorrect Username or Password!! please Try again !! Ask Pass From Rajveer' });
    }

    const isMatch = await user.comparePassword(passVal);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect Username or Password!! please Try again !! Ask Pass From Rajveer' });
    }

    // In the legacy code, silveroak can log in as either role. Let's update the database role dynamically if needed, 
    // or just allow silveroak to assume the selected role for this session!
    // Since we want the user experience to be seamless:
    if (user.username === 'silveroak' && user.role !== selectedRole) {
      user.role = selectedRole;
      await user.save();
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        completedTopics: user.completedTopics
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get user data
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/progress
// @desc    Update completed topics
// @access  Private
router.put('/progress', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.completedTopics = req.body.completedTopics || [];
    await user.save();

    res.json({
      message: 'Progress updated successfully',
      completedTopics: user.completedTopics
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
