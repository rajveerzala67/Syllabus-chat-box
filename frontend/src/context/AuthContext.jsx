import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// Create Axios instance using environment variable or default relative /api path (proxied by Vite)
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set auth header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      
      // Fetch user profile if not loaded
      if (!user) {
        api.get('/auth/me')
          .then(res => {
            setUser(res.data);
            setLoading(false);
          })
          .catch(err => {
            console.error('Error fetching profile, logging out:', err);
            logout();
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password, role) => {
    try {
      const res = await api.post('/auth/login', { username, password, role });
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (username, email, password, role, passkey) => {
    try {
      const res = await api.post('/auth/register', { username, email, password, role, passkey });
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed'
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update password'
      };
    }
  };

  const requestOtp = async (email) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return { success: true, data: res.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to send OTP email',
        secondsLeft: err.response?.data?.secondsLeft
      };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      return { success: true, data: res.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to verify OTP',
        remainingAttempts: err.response?.data?.remainingAttempts
      };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to reset password'
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateProgress = async (completedTopics) => {
    try {
      const res = await api.put('/auth/progress', { completedTopics });
      setUser(prev => ({ ...prev, completedTopics: res.data.completedTopics }));
      return { success: true };
    } catch (err) {
      console.error('Failed to sync progress:', err);
      return { success: false, message: 'Sync failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      changePassword,
      requestOtp, 
      verifyOtp, 
      resetPassword, 
      logout, 
      updateProgress 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
