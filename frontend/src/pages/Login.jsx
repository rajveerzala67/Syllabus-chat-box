import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, User, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login, register, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If token is present, auto-redirect to Home
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const userTrim = username.trim();
    const passTrim = password.trim();

    // Replicate legacy front-end checks with alert alerts
    if (userTrim === '' && passTrim === '') {
      const msg = "Please Enter User Name And Password.....";
      alert(msg);
      setErrorMsg(msg);
      return;
    }

    if (userTrim.toLowerCase() === 'rajveer' && passTrim === '') {
      const msg = "Please Enter the Pass !! UserName Is Correct... ";
      alert(msg);
      setErrorMsg(msg);
      return;
    }

    if (isRegistering) {
      if (passTrim.length < 4) {
        setErrorMsg('Password should be at least 4 characters long');
        return;
      }
      const result = await register(userTrim, passTrim, role);
      if (result.success) {
        navigate('/');
      } else {
        setErrorMsg(result.message);
      }
    } else {
      const result = await login(userTrim, passTrim, role);
      if (result.success) {
        navigate('/');
      } else {
        alert(result.message);
        setErrorMsg(result.message);
      }
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="login-box glass-card">
        <div className="welcome-banner">
          <BookOpen className="book-logo bounce-anim" size={40} />
          <h2>Welcome to Syllabus Checkbox</h2>
          <p className="subtitle">Track your learning journey in real-time</p>
        </div>

        <div className="auth-toggle">
          <button 
            className={`toggle-tab ${!isRegistering ? 'active' : ''}`}
            onClick={() => { setIsRegistering(false); setErrorMsg(''); }}
          >
            Login
          </button>
          <button 
            className={`toggle-tab ${isRegistering ? 'active' : ''}`}
            onClick={() => { setIsRegistering(true); setErrorMsg(''); }}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="error-alert">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <div className="form-section">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                type="text"
                id="username"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <button 
                type="button" 
                className="show-pass-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="role">Login as</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="custom-select"
            >
              <option value="student">Student</option>
              <option value="coordinator">Class Coordinator</option>
            </select>
          </div>

          <button onClick={handleSubmit} className="primary-btn">
            {isRegistering ? 'Register Account' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
