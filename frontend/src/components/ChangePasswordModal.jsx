import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, KeyRound, Lock, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react';

const ChangePasswordModal = () => {
  const { user, changePassword } = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // If user does not require mandatory password change, do not render
  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    const passToSubmit = currentPassword.trim() || 'setup';
    const result = await changePassword(passToSubmit, newPassword.trim());
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="sky-modal-backdrop" style={{ zIndex: 999999 }}>
      <div className="sky-otp-modal fade-in" style={{ maxWidth: '460px' }}>
        <div className="modal-step-header" style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div className="modal-icon-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
            <ShieldAlert size={32} />
          </div>
          <h3 style={{ color: '#0f172a', fontSize: '22px', fontWeight: 800 }}>
            Set Your New Password
          </h3>
          <p style={{ color: '#64748b', fontSize: '13.5px' }}>
            Welcome! Set your permanent password below to complete your account setup and access your dashboard.
          </p>
        </div>

        {errorMsg && (
          <div className="sky-alert-error mb-16">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="sky-input-group">
            <label>Current / Temporary Password (Optional)</label>
            <div className="sky-input-wrapper">
              <KeyRound className="sky-input-icon" size={18} />
              <input
                type={showCurrentPass ? "text" : "password"}
                className="sky-input"
                placeholder="Temporary password (e.g. SOU1234)"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="sky-pass-toggle" 
                onClick={() => setShowCurrentPass(!showCurrentPass)}
              >
                {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              * First time setup: You can leave this blank if you don't have your temporary password.
            </small>
          </div>

          <div className="sky-input-group">
            <label>New Password *</label>
            <div className="sky-input-wrapper">
              <Lock className="sky-input-icon" size={18} />
              <input
                type={showPass ? "text" : "password"}
                className="sky-input"
                placeholder="Enter new password (min 4 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="sky-pass-toggle" 
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="sky-input-group">
            <label>Confirm New Password *</label>
            <div className="sky-input-wrapper">
              <Lock className="sky-input-icon" size={18} />
              <input
                type={showPass ? "text" : "password"}
                className="sky-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="sky-primary-btn mt-10" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="spinner mr-6" />
                Setting Password...
              </>
            ) : (
              'Save New Password & Enter Dashboard'
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
