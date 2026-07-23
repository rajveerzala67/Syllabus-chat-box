import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  BookOpen, User, Mail, Lock, Eye, EyeOff, X, 
  KeyRound, ShieldCheck, ArrowRight, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const Login = () => {
  const { login, register, requestOtp, verifyOtp, resetPassword, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Sliding panel state
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);

  // Form states - Login
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginRole, setLoginRole] = useState('student');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Form states - Register
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regPasskey, setRegPasskey] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegPasskey, setShowRegPasskey] = useState(false);

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal / OTP state for Password Reset
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  // Timers & Attempt counters
  const [resendCooldown, setResendCooldown] = useState(0); // 60s cooldown
  const [expiryTime, setExpiryTime] = useState(0); // 300s expiration
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  // Redirect if logged in
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  // Resend cooldown timer decrement
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // OTP Expiration timer decrement
  useEffect(() => {
    let timer;
    if (expiryTime > 0) {
      timer = setInterval(() => {
        setExpiryTime(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [expiryTime]);

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const userTrim = loginUser.trim();
    const passTrim = loginPass.trim();

    if (userTrim === '' && passTrim === '') {
      setErrorMsg("Please Enter User Name And Password.....");
      return;
    }

    if (userTrim.toLowerCase() === 'rajveer' && passTrim === '') {
      setErrorMsg("Please Enter the Pass !! UserName Is Correct... ");
      return;
    }

    setLoading(true);
    const result = await login(userTrim, passTrim, loginRole);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const userTrim = regUser.trim();
    const emailTrim = regEmail.trim();
    const passTrim = regPass.trim();
    const passkeyTrim = regPasskey.trim();

    if (!userTrim) {
      setErrorMsg('Username is required');
      return;
    }

    if (passTrim.length < 4) {
      setErrorMsg('Password should be at least 4 characters long');
      return;
    }

    if (regRole === 'teacher' && !passkeyTrim) {
      setErrorMsg('Security passkey "teacher67" is required for Teacher registration.');
      return;
    }

    if (regRole === 'coordinator' && !passkeyTrim) {
      setErrorMsg('Security passkey "cc67" is required for Class Coordinator registration.');
      return;
    }

    setLoading(true);
    const result = await register(userTrim, emailTrim, passTrim, regRole, passkeyTrim);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.message);
    }
  };

  // --- OTP FORGOT PASSWORD HANDLERS ---
  const handleOpenOtpModal = () => {
    setShowOtpModal(true);
    setOtpStep(1);
    setResetEmail(loginUser.includes('@') ? loginUser : '');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpError('');
    setOtpSuccess('');
    setRemainingAttempts(5);
  };

  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setOtpStep(1);
    setOtpError('');
    setOtpSuccess('');
  };

  // Step 1: Send OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccess('');

    if (!resetEmail || !resetEmail.trim()) {
      setOtpError('Please enter a valid email or username.');
      return;
    }

    setOtpLoading(true);
    const result = await requestOtp(resetEmail.trim());
    setOtpLoading(false);

    if (result.success) {
      setOtpSuccess(result.data.message || 'OTP sent successfully!');
      if (result.data.email) {
        setResetEmail(result.data.email);
      }
      setOtpStep(2);
      setResendCooldown(60); // 60s cooldown limit
      setExpiryTime(300); // 5 minutes validity
      setRemainingAttempts(5);
    } else {
      if (result.secondsLeft) {
        setResendCooldown(result.secondsLeft);
      }
      setOtpError(result.message);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccess('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }

    setOtpLoading(true);
    const result = await verifyOtp(resetEmail, otpCode.trim());
    setOtpLoading(false);

    if (result.success) {
      setOtpSuccess('OTP verified! Please set your new password.');
      setOtpStep(3);
    } else {
      if (result.remainingAttempts !== undefined) {
        setRemainingAttempts(result.remainingAttempts);
      }
      setOtpError(result.message);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccess('');

    if (!newPassword || newPassword.trim().length < 4) {
      setOtpError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setOtpError('Passwords do not match.');
      return;
    }

    setOtpLoading(true);
    const result = await resetPassword(resetEmail, otpCode.trim(), newPassword.trim());
    setOtpLoading(false);

    if (result.success) {
      setOtpStep(4);
      setSuccessMsg('Password reset successful! Please log in with your new password.');
    } else {
      setOtpError(result.message);
    }
  };

  // Helper format seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="sky-auth-bg fade-in">
      <div className={`sliding-auth-container ${isRightPanelActive ? 'right-panel-active' : ''}`}>
        
        {/* SIGN UP FORM (RIGHT SLIDE TARGET) */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Join Syllabus Portal & track your subjects in real-time</p>
            </div>

            {isRightPanelActive && errorMsg && (
              <div className="sky-alert-error">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <div className="sky-input-group">
              <label htmlFor="reg-username">Username</label>
              <div className="sky-input-wrapper">
                <User className="sky-input-icon" size={18} />
                <input
                  type="text"
                  id="reg-username"
                  className="sky-input"
                  placeholder="Choose username"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                />
              </div>
            </div>

            <div className="sky-input-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="sky-input-wrapper">
                <Mail className="sky-input-icon" size={18} />
                <input
                  type="email"
                  id="reg-email"
                  className="sky-input"
                  placeholder="your.email@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="sky-input-group">
              <label htmlFor="reg-password">Password</label>
              <div className="sky-input-wrapper">
                <Lock className="sky-input-icon" size={18} />
                <input
                  type={showRegPass ? "text" : "password"}
                  id="reg-password"
                  className="sky-input"
                  placeholder="At least 4 characters"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                />
                <button 
                  type="button" 
                  className="sky-pass-toggle"
                  onClick={() => setShowRegPass(!showRegPass)}
                >
                  {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="sky-input-group">
              <label htmlFor="reg-role">Role</label>
              <select
                id="reg-role"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="sky-select"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="coordinator">Class Coordinator</option>
              </select>
            </div>

            {(regRole === 'teacher' || regRole === 'coordinator') && (
              <div className="sky-input-group fade-in">
                <label htmlFor="reg-passkey">
                  Security Passkey ({regRole === 'teacher' ? 'Teacher' : 'Class Coordinator'}) *
                </label>
                <div className="sky-input-wrapper">
                  <KeyRound className="sky-input-icon" size={18} />
                  <input
                    type={showRegPasskey ? "text" : "password"}
                    id="reg-passkey"
                    className="sky-input"
                    placeholder={regRole === 'teacher' ? 'Enter passkey (teacher67)' : 'Enter passkey (cc67)'}
                    value={regPasskey}
                    onChange={(e) => setRegPasskey(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="sky-pass-toggle"
                    onClick={() => setShowRegPasskey(!showRegPasskey)}
                  >
                    {showRegPasskey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="sky-primary-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <button 
              type="button" 
              className="mobile-toggle-btn"
              onClick={() => { setIsRightPanelActive(false); setErrorMsg(''); }}
            >
              <span>Already have an account?</span>
              <span className="toggle-highlight">Sign In</span>
            </button>
          </form>
        </div>

        {/* SIGN IN FORM (LEFT DEFAULT) */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleLoginSubmit}>
            <div className="form-header">
              <h2>Sign In</h2>
              <p>Welcome back! Access your syllabus & progress</p>
            </div>

            {!isRightPanelActive && errorMsg && (
              <div className="sky-alert-error">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="sky-alert-success">
                <span>✅ {successMsg}</span>
              </div>
            )}

            <div className="sky-input-group">
              <label htmlFor="login-username">Username or Email</label>
              <div className="sky-input-wrapper">
                <User className="sky-input-icon" size={18} />
                <input
                  type="text"
                  id="login-username"
                  className="sky-input"
                  placeholder="Enter Username or Email"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
              </div>
            </div>

            <div className="sky-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password">Password</label>
                <button 
                  type="button" 
                  className="forgot-pass-btn"
                  onClick={handleOpenOtpModal}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="sky-input-wrapper">
                <Lock className="sky-input-icon" size={18} />
                <input
                  type={showLoginPass ? "text" : "password"}
                  id="login-password"
                  className="sky-input"
                  placeholder="Enter Password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
                <button 
                  type="button" 
                  className="sky-pass-toggle"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                >
                  {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="sky-input-group">
              <label htmlFor="login-role">Login as</label>
              <select
                id="login-role"
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value)}
                className="sky-select"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="coordinator">Class Coordinator</option>
              </select>
            </div>

            <button type="submit" className="sky-primary-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <button 
              type="button" 
              className="mobile-toggle-btn"
              onClick={() => { setIsRightPanelActive(true); setErrorMsg(''); }}
            >
              <span>Don't have an account?</span>
              <span className="toggle-highlight">Sign Up</span>
            </button>
          </form>
        </div>

        {/* SLIDING OVERLAY CONTAINER */}
        <div className="overlay-container">
          <div className="overlay">
            
            {/* OVERLAY LEFT (Appears when Sign Up is active) */}
            <div className="overlay-panel overlay-left">
              <BookOpen size={48} style={{ marginBottom: '16px', opacity: 0.95 }} />
              <h1>Welcome Back!</h1>
              <p>To stay connected with your syllabus updates and class progress, please log in with your account.</p>
              <button 
                className="ghost-btn" 
                onClick={() => { setIsRightPanelActive(false); setErrorMsg(''); }}
              >
                Sign In
              </button>
            </div>

            {/* OVERLAY RIGHT (Appears when Sign In is active) */}
            <div className="overlay-panel overlay-right">
              <BookOpen size={48} style={{ marginBottom: '16px', opacity: 0.95 }} />
              <h1>Hello, Student!</h1>
              <p>Enter your details and start tracking your academic journey with instant updates & files.</p>
              <button 
                className="ghost-btn" 
                onClick={() => { setIsRightPanelActive(true); setErrorMsg(''); }}
              >
                Sign Up
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* BREVO OTP FORGOT PASSWORD MODAL */}
      {showOtpModal && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal fade-in">
            <button className="modal-close-btn" onClick={handleCloseOtpModal}>
              <X size={18} />
            </button>

            {/* Steps Indicator */}
            <div className="otp-steps-indicator">
              <div className={`step-dot ${otpStep >= 1 ? (otpStep > 1 ? 'completed' : 'active') : ''}`}>1</div>
              <div className={`step-line ${otpStep > 1 ? 'active' : ''}`} />
              <div className={`step-dot ${otpStep >= 2 ? (otpStep > 2 ? 'completed' : 'active') : ''}`}>2</div>
              <div className={`step-line ${otpStep > 2 ? 'active' : ''}`} />
              <div className={`step-dot ${otpStep >= 3 ? (otpStep > 3 ? 'completed' : 'active') : ''}`}>3</div>
            </div>

            {/* STEP 1: Enter Email */}
            {otpStep === 1 && (
              <form onSubmit={handleRequestOtp}>
                <div className="modal-step-header">
                  <div className="modal-icon-badge">
                    <Mail size={26} />
                  </div>
                  <h3>Reset Password</h3>
                  <p>Enter your registered email address to receive a secure 6-digit Brevo OTP code.</p>
                </div>

                {otpError && (
                  <div className="sky-alert-error">
                    <span>⚠️ {otpError}</span>
                  </div>
                )}

                <div className="sky-input-group">
                  <label htmlFor="reset-email">Email Address or Username</label>
                  <div className="sky-input-wrapper">
                    <Mail className="sky-input-icon" size={18} />
                    <input
                      type="text"
                      id="reset-email"
                      className="sky-input"
                      placeholder="your.email@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="sky-primary-btn" disabled={otpLoading || resendCooldown > 0}>
                  {otpLoading ? 'Sending Brevo OTP...' : (resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send OTP Code')}
                </button>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {otpStep === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <div className="modal-step-header">
                  <div className="modal-icon-badge">
                    <ShieldCheck size={26} />
                  </div>
                  <h3>Enter OTP Code</h3>
                  <p>Check <strong>{resetEmail}</strong> for your 6-digit security code.</p>
                </div>

                {otpError && (
                  <div className="sky-alert-error">
                    <span>⚠️ {otpError}</span>
                  </div>
                )}

                {otpSuccess && (
                  <div className="sky-alert-success">
                    <span>✅ {otpSuccess}</span>
                  </div>
                )}

                <div className="sky-input-group">
                  <label htmlFor="otp-code">6-Digit OTP</label>
                  <div className="sky-input-wrapper">
                    <KeyRound className="sky-input-icon" size={18} />
                    <input
                      type="text"
                      id="otp-code"
                      maxLength={6}
                      className="sky-input otp-pin-input"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                </div>

                <div className="otp-status-badges">
                  <span className="timer-badge">
                    <Clock size={14} /> Expires in: {formatTime(expiryTime)}
                  </span>
                  <span className="attempt-badge">
                    {remainingAttempts} attempt(s) left
                  </span>
                </div>

                <button type="submit" className="sky-primary-btn" disabled={otpLoading || otpCode.length !== 6}>
                  {otpLoading ? 'Verifying OTP...' : 'Verify & Continue'}
                </button>

                <div className="resend-box">
                  Didn't get the code?{' '}
                  <button 
                    type="button"
                    className="resend-btn" 
                    disabled={resendCooldown > 0 || otpLoading}
                    onClick={handleRequestOtp}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {otpStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <div className="modal-step-header">
                  <div className="modal-icon-badge">
                    <Lock size={26} />
                  </div>
                  <h3>Set New Password</h3>
                  <p>Choose a strong new password for your account.</p>
                </div>

                {otpError && (
                  <div className="sky-alert-error">
                    <span>⚠️ {otpError}</span>
                  </div>
                )}

                <div className="sky-input-group">
                  <label htmlFor="new-password">New Password</label>
                  <div className="sky-input-wrapper">
                    <Lock className="sky-input-icon" size={18} />
                    <input
                      type={showNewPass ? "text" : "password"}
                      id="new-password"
                      className="sky-input"
                      placeholder="At least 4 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="sky-pass-toggle"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="sky-input-group">
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <div className="sky-input-wrapper">
                    <Lock className="sky-input-icon" size={18} />
                    <input
                      type={showNewPass ? "text" : "password"}
                      id="confirm-password"
                      className="sky-input"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="sky-primary-btn" disabled={otpLoading}>
                  {otpLoading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            )}

            {/* STEP 4: Success State */}
            {otpStep === 4 && (
              <div className="modal-step-header" style={{ marginBottom: 0 }}>
                <div className="modal-icon-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3>Password Updated!</h3>
                <p style={{ marginBottom: '24px' }}>Your password has been reset successfully. You can now log in with your new credentials.</p>
                
                <button 
                  type="button" 
                  className="sky-primary-btn"
                  onClick={handleCloseOtpModal}
                >
                  Done & Sign In
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
