import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#fff',
        fontSize: '20px',
        fontFamily: "'Segoe UI', sans-serif"
      }}>
        <div className="spinner">Loading Syllabus Checkbox...</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on role if trying to access unauthorized route
    if (user.role === 'student' || user.role === 'coordinator') {
      return <Navigate to="/report" replace />;
    }
    if (user.role === 'teacher' || user.role === 'admin') {
      return <Navigate to="/students" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
