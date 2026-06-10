# Syllabus Checkbox - MERN Full Stack Application

This project is a MERN (MongoDB, Express, React, Node.js) full-stack application converted from the legacy static HTML, CSS, and JS codebase.

It features a modern React interface styled with custom Glassmorphism components, secure JWT-based authentication, and a MongoDB-connected REST API for real-time progress syncing, syllabus updates, and class file uploads.

---

## Folder Structure

- `/backend`: Node.js & Express server, Mongoose models, and upload middleware.
- `/frontend`: React & Vite application with a premium HSL design system.
- `/legacy`: Backups of the original HTML, JS, and CSS files.

---

## Prerequisites

1. **Node.js**: Install Node.js (v18+ recommended).
2. **MongoDB**: Make sure you have MongoDB installed and running locally on `mongodb://127.0.0.1:27017/syllabus-db`, or edit `backend/.env` to point to a custom MongoDB Atlas URI.

---

## Getting Started

1. **Install Dependencies** (Root, Backend, and Frontend):
   Run the following command at the root directory of the project:
   ```bash
   npm run install-all
   ```

2. **Run the Application** (in development mode):
   Run the following command at the root directory of the project:
   ```bash
   npm run dev
   ```
   This will concurrently spin up:
   - The Express backend on `http://localhost:5000`
   - The React dev server on `http://localhost:5173`

3. **Open the browser**:
   Navigate to `http://localhost:5173` to access the application.

---

## Seed Credentials

Upon database connection, the application automatically seeds two default accounts if they do not exist:
1. **Class Coordinator**:
   - **Username**: `silveroak`
   - **Password**: `12345`
2. **Student**:
   - **Username**: `rajveer`
   - **Password**: `12345`

*Note: You can also use the **Register** tab on the login screen to sign up with custom credentials.*
