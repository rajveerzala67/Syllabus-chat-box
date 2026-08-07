const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Store io instance on app for controller access
app.set('socketio', io);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join specific attendance session room
  socket.on('join-session', (sessionId) => {
    if (sessionId) {
      socket.join(sessionId);
      console.log(`[Socket.IO] Socket ${socket.id} joined attendance session room: ${sessionId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({
  origin: true, // Dynamically mirror requesting origin for mobile compatibility
  credentials: true
}));
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mounting routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/syllabus', require('./routes/syllabus'));
app.use('/api/files', require('./routes/files'));
app.use('/api/students', require('./routes/students'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/library', require('./routes/library'));

// Base route for sanity check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Academic Management System & NFC Library API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Server error occurred'
  });
});

const PORT = process.env.PORT || 5000;

const { cleanupExpiredLectures } = require('./controllers/lectureController');

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server & Socket.IO running on 0.0.0.0:${PORT}`);
  
  // Run initial cleanup of past day lectures
  cleanupExpiredLectures();

  // Periodic cleanup check every 1 hour (auto-deletes past day lectures after 12:00 AM)
  setInterval(() => {
    cleanupExpiredLectures();
  }, 60 * 60 * 1000);
});
