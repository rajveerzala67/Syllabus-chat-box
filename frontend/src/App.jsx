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
import LibraryDashboard from './pages/LibraryDashboard';
import LibraryScanner from './pages/LibraryScanner';
import StudentLibrary from './pages/StudentLibrary';
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
            path="/library" 
            element={
              <ProtectedRoute allowedRoles={['library_staff', 'teacher', 'admin']}>
                <Layout>
                  <LibraryDashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/library-scanner" 
            element={
              <ProtectedRoute allowedRoles={['library_staff', 'teacher', 'admin']}>
                <Layout>
                  <LibraryScanner />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-library" 
            element={
              <ProtectedRoute allowedRoles={['student', 'coordinator']}>
                <Layout>
                  <StudentLibrary />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lectures" 
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <Layout>
                  <Lectures />
                </Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/attendance-reports" 
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <Layout>
                  <AttendanceReports />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report" 
            element={
              <ProtectedRoute allowedRoles={['student', 'coordinator']}>
                <Layout>
                  <StudentAttendance />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-attendance" 
            element={
              <ProtectedRoute allowedRoles={['student', 'coordinator']}>
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
