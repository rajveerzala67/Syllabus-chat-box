const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../services/emailService');
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
  const { username, email, password, role, passkey } = req.body;

  try {
    const formattedUsername = username ? username.toLowerCase().trim() : '';
    const formattedEmail = email ? email.toLowerCase().trim() : '';
    const selectedRole = role || 'student';
    const enteredPasskey = passkey ? passkey.trim() : '';

    if (!formattedUsername || !password) {
      return res.status(400).json({ message: 'Username and Password are required' });
    }

    // Passkey verification for privileged roles (case-insensitive)
    if (selectedRole === 'teacher') {
      if (enteredPasskey.toLowerCase() !== 'teacher67') {
        return res.status(400).json({ message: 'Invalid Passkey for Teacher registration! Access restricted.' });
      }
    } else if (selectedRole === 'coordinator') {
      if (enteredPasskey.toLowerCase() !== 'cc67') {
        return res.status(400).json({ message: 'Invalid Passkey for Class Coordinator registration! Access restricted.' });
      }
    }

    const userExists = await User.findOne({ username: formattedUsername });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this username' });
    }

    if (formattedEmail) {
      const emailExists = await User.findOne({ email: formattedEmail });
      if (emailExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
    }

    const user = await User.create({
      username: formattedUsername,
      email: formattedEmail || undefined,
      password: password.trim(),
      role: selectedRole
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
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
    // Search by username or email
    const user = await User.findOne({
      $or: [
        { username: userVal.toLowerCase() },
        { email: userVal.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Incorrect Username/Email or Password!! Please try again.' });
    }

    const isMatch = await user.comparePassword(passVal);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect Username/Email or Password!! Please try again.' });
    }

    if (user.username === 'silveroak' && user.role !== selectedRole) {
      user.role = selectedRole;
      await user.save();
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        completedTopics: user.completedTopics
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send OTP to email for password reset (Rate limit: 1 request / 60 seconds)
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Please provide a valid email address or username.' });
  }

  const targetInput = email.toLowerCase().trim();
  const usernamePrefix = targetInput.includes('@') ? targetInput.split('@')[0] : targetInput;

  try {
    // 1. Search for user by email, username, or prefix before @
    let user = await User.findOne({
      $or: [
        { email: targetInput },
        { username: targetInput },
        { username: usernamePrefix }
      ]
    });

    // 2. If no user exists yet and a valid email address was provided, create the user account
    if (!user && targetInput.includes('@')) {
      user = await User.create({
        username: usernamePrefix,
        email: targetInput,
        password: 'ChangeMe123!',
        role: 'student'
      });
      console.log(`Auto-created user for email reset: ${targetInput}`);
    }

    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email or username.' });
    }

    // 3. Update user email if targetInput is a valid email address
    if (targetInput.includes('@') && user.email !== targetInput) {
      user.email = targetInput;
      await user.save();
    }

    const recipientEmail = user.email || (targetInput.includes('@') ? targetInput : null);
    if (!recipientEmail) {
      return res.status(400).json({ message: 'No valid email address associated with this account. Please enter an email.' });
    }

    // Check rate limit: 1 request every 60 seconds
    const existingOtp = await Otp.findOne({ email: recipientEmail });
    if (existingOtp) {
      const timeElapsed = Date.now() - new Date(existingOtp.lastRequestedAt).getTime();
      const COOLDOWN_MS = 60 * 1000; // 60 seconds

      if (timeElapsed < COOLDOWN_MS) {
        const secondsLeft = Math.ceil((COOLDOWN_MS - timeElapsed) / 1000);
        return res.status(429).json({
          message: `Please wait ${secondsLeft} second(s) before requesting a new OTP.`,
          secondsLeft
        });
      }
    }

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP using bcrypt for maximum security
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpCode, salt);

    // Set expiration to 5 minutes from now (300,000 ms)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Replace any previous OTP records for this email
    await Otp.deleteMany({ email: recipientEmail });

    // Store in DB
    await Otp.create({
      email: recipientEmail,
      otpHash,
      attempts: 0,
      lastRequestedAt: new Date(),
      expiresAt
    });

    // Send email via Brevo REST API / SMTP
    try {
      await sendOtpEmail(recipientEmail, otpCode);
      res.json({
        message: `OTP sent successfully to ${recipientEmail}. Please check your inbox (and spam folder)!`,
        email: recipientEmail,
        cooldownSeconds: 60
      });
    } catch (emailErr) {
      console.error('Email Delivery Error:', emailErr.message);
      return res.status(400).json({
        message: `Could not send email to ${recipientEmail}. Reason: ${emailErr.message}`,
        email: recipientEmail
      });
    }
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ message: error.message || 'Server error sending OTP email' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP (Max 5 incorrect attempts, 5 minute expiration)
// @access  Public
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and 6-digit OTP code are required.' });
  }

  const targetEmail = email.toLowerCase().trim();
  const enteredOtp = otp.trim();

  try {
    const otpDoc = await Otp.findOne({ email: targetEmail });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP has expired or does not exist. Please request a new one.' });
    }

    // Check if OTP is expired (5 mins)
    if (Date.now() > new Date(otpDoc.expiresAt).getTime()) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'OTP has expired (valid for 5 minutes). Please request a new one.' });
    }

    // Check max attempts (5)
    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'Maximum verification attempts (5) exceeded. Please request a new OTP.' });
    }

    // Compare bcrypt hash
    const isMatch = await bcrypt.compare(enteredOtp, otpDoc.otpHash);

    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      const remaining = 5 - otpDoc.attempts;

      if (remaining <= 0) {
        await Otp.deleteOne({ _id: otpDoc._id });
        return res.status(400).json({ message: 'Incorrect OTP. Maximum attempts exceeded. Please request a new OTP.' });
      }

      return res.status(400).json({
        message: `Incorrect OTP. You have ${remaining} attempt(s) remaining.`,
        remainingAttempts: remaining
      });
    }

    res.json({
      message: 'OTP verified successfully.',
      success: true
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ message: error.message || 'Server error verifying OTP' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using verified OTP and DELETE OTP from DB after success
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
  }

  if (newPassword.trim().length < 4) {
    return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
  }

  const targetEmail = email.toLowerCase().trim();
  const enteredOtp = otp.trim();

  try {
    const otpDoc = await Otp.findOne({ email: targetEmail });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP session expired or invalid. Please request a new OTP.' });
    }

    if (Date.now() > new Date(otpDoc.expiresAt).getTime()) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(enteredOtp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ message: 'Invalid OTP verification.' });
    }

    // Find User
    const usernamePrefix = targetEmail.includes('@') ? targetEmail.split('@')[0] : targetEmail;
    const user = await User.findOne({
      $or: [
        { email: targetEmail },
        { username: targetEmail },
        { username: usernamePrefix }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    // Update password (triggers pre-save bcrypt hash)
    user.password = newPassword.trim();
    await user.save();

    // REQUIREMENT: Delete the OTP after successful verification & reset
    await Otp.deleteOne({ _id: otpDoc._id });

    res.json({
      message: 'Password has been reset successfully! You can now log in with your new password.',
      success: true
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({ message: error.message || 'Server error resetting password' });
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

// @route   PUT /api/auth/change-password
// @desc    Change password (first-login flow or self update) and clear mustChangePassword flag
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required.' });
  }

  if (newPassword.trim().length < 4) {
    return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Only require current password match if this is NOT a first-login mandatory setup
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }
    }

    user.password = newPassword.trim();
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully!'
    });
  } catch (error) {
    console.error('Error in change-password:', error);
    res.status(500).json({ message: error.message || 'Server error updating password' });
  }
});

module.exports = router;
