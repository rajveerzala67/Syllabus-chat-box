const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey12345');
      
      // Get user from database
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).json({ message: `Forbidden: Access restricted to ${role}s only` });
    }
  };
};

const teacherOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'coordinator' || req.user.role === 'teacher')) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Access restricted to logged-in teachers/coordinators only' });
  }
};

module.exports = { protect, requireRole, teacherOnly };
