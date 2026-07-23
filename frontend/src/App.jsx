import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChangePasswordModal from './components/ChangePasswordModal';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import Students from './pages/Students';
import Lectures from './pages/Lectures';
import NfcScanner from './pages/NfcScanner';
import AttendanceReports from './pages/AttendanceReports';
import StudentAttendance from './pages/StudentAttendance';
import Files from './pages/Files';
import SyllabusUpdater from './pages/SyllabusUpdater';
import About from './pages/About';
import Contact from './pages/Contact';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Navbar />
      <ChangePasswordModal />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lectures" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Lectures />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nfc-scanner/:sessionId" 
            element={
              <ProtectedRoute>
                <Layout>
                  <NfcScanner />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance-reports" 
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceReports />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-attendance" 
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentAttendance />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/files" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Files />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/updates" 
            element={
              <ProtectedRoute>
                <Layout>
                  <SyllabusUpdater />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/about" 
            element={
              <ProtectedRoute>
                <Layout>
                  <About />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/contact" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Contact />
                </Layout>
              </ProtectedRoute>
            } 
          />

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
