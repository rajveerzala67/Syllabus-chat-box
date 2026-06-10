import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// Create default Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
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

  const register = async (username, password, role) => {
    try {
      const res = await api.post('/auth/register', { username, password, role });
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
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProgress }}>
      {children}
    </AuthContext.Provider>
  );
};
