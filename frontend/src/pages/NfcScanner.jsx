import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Smartphone, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert,
  Users, Layers, MapPin, Clock, Search, Zap, Radio, Check
} from 'lucide-react';

const NfcScanner = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [session, setSession] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Web NFC State
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Manual NFC Tap Input State (for desktop testing or USB readers)
  const [simulatedTag, setSimulatedTag] = useState('');
  const [submittingScan, setSubmittingScan] = useState(false);

  // Toast / Alert Notification
  const [alert, setAlert] = useState({ show: false, type: '', title: '', message: '', student: null });

  const showAlert = (type, title, message, student = null) => {
    setAlert({ show: true, type, title, message, student });
    setTimeout(() => setAlert({ show: false, type: '', title: '', message: '', student: null }), 2000);
  };

  // Fetch session details & previous scans
  const fetchSessionData = async () => {
    try {
      const res = await api.get(`/attendance/session/${sessionId}`);
      setScans(res.data.scans || []);
    } catch (err) {
      console.error('Error fetching session scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();

    // Check if browser supports Web NFC (Android Chrome)
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      startWebNfcReader();
    }

    // Connect Socket.IO client for live broadcast
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(socketUrl);

    socket.emit('join-session', sessionId);

    socket.on('nfc:scanned', (scanData) => {
      setScans(prev => [scanData, ...prev.filter(s => s.student._id !== scanData.student._id)]);
      showAlert(
        'success',
        'Attendance Marked Successfully',
        `${scanData.student.fullName} (${scanData.student.enrollmentNumber}) logged in.`,
        scanData.student
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // Web NFC Reader Handler (Android Devices)
  const startWebNfcReader = async () => {
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      setIsScanning(true);

      ndef.addEventListener('reading', ({ serialNumber, message }) => {
        let scannedTagValue = '';

        // 1. Decode written NDEF Text / URI payload (e.g. Enrollment Number "2301030400068")
        if (message && message.records && message.records.length > 0) {
          for (const record of message.records) {
            try {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              const decodedText = textDecoder.decode(record.data).trim();
              if (decodedText) {
                // Strip non-printable characters or language codes (e.g. \x02en2301030400068 -> 2301030400068)
                scannedTagValue = decodedText.replace(/^[^\w]+(en|es|fr|de)?/i, '').trim() || decodedText;
                if (scannedTagValue) break;
              }
            } catch (decErr) {
              console.warn('NDEF Record decoding warning:', decErr);
            }
          }
        }

        // 2. Fallback to hardware chip Serial Number if no text payload found
        if (!scannedTagValue && serialNumber) {
          const cleanSerial = serialNumber.replace(/:/g, '').toUpperCase();
          scannedTagValue = cleanSerial.startsWith('NFC-') ? cleanSerial : `NFC-${cleanSerial}`;
        }

        console.log('📱 Web NFC Scanned Payload:', scannedTagValue);
        if (scannedTagValue) {
          processNfcScan(scannedTagValue);
        }
      });
    } catch (error) {
      console.warn('Web NFC reading error:', error);
      setIsScanning(false);
    }
  };

  // Send NFC Card Tag Number to Backend API
  const processNfcScan = async (nfcCardNumber) => {
    if (!nfcCardNumber.trim()) return;

    setSubmittingScan(true);
    try {
      const res = await api.post('/attendance/scan-nfc', {
        nfcCardNumber: nfcCardNumber.trim(),
        sessionId
      });

      showAlert(
        'success',
        'Attendance Marked Successfully',
        `${res.data.student.fullName} (${res.data.student.enrollmentNumber})`,
        res.data.student
      );
      setSimulatedTag('');
      fetchSessionData();
    } catch (err) {
      console.error('NFC scan error:', err);
      const errMsg = err.response?.data?.message || 'Invalid NFC Card / Attendance Rejected';
      showAlert('error', 'Tap Rejected', errMsg);
    } finally {
      setSubmittingScan(false);
    }
  };

  const handleSimulatedSubmit = (e) => {
    e.preventDefault();
    if (simulatedTag) {
      processNfcScan(simulatedTag);
    }
  };

  return (
    <div className="container student-page-container fade-in">

      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box" style={{ background: '#0284c7' }}>
            <Radio size={32} className="spinner" />
          </div>
          <div>
            <h2>Live NFC Attendance Scanner</h2>
            <p className="subtitle">Tap NFC Card on Web NFC Android Reader or enter Tag Number below</p>
          </div>
        </div>
        <div className="header-right">
          <button className="outline-btn" onClick={() => navigate('/lectures')}>
            <X size={16} className="mr-6" /> Back to Lectures
          </button>
        </div>
      </div>

      {/* 2-SECOND ATTENDANCE COMPLETED POPUP MODAL */}
      {alert.show && (
        <div className="sky-modal-backdrop" style={{ zIndex: 999999 }}>
          <div className="sky-otp-modal fade-in" style={{
            maxWidth: '420px',
            width: '90%',
            padding: '32px 24px',
            textAlign: 'center',
            background: alert.type === 'success' 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)' 
              : 'linear-gradient(135deg, rgba(225, 29, 72, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: alert.type === 'success' ? '2px solid #10b981' : '2px solid #e11d48',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(225, 29, 72, 0.2)',
              color: alert.type === 'success' ? '#34d399' : '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              {alert.type === 'success' ? <CheckCircle2 size={42} /> : <AlertCircle size={42} />}
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 800, color: alert.type === 'success' ? '#34d399' : '#f43f5e', marginBottom: '6px' }}>
              {alert.type === 'success' ? 'Attendance Completed!' : alert.title}
            </h3>

            {alert.student && (
              <div style={{ margin: '16px 0' }}>
                {alert.student.photoUrl && (
                  <img 
                    src={alert.student.photoUrl} 
                    alt={alert.student.fullName} 
                    style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #34d399', margin: '0 auto 12px auto', display: 'block' }}
                  />
                )}
                <h4 style={{ fontSize: '19px', color: '#ffffff', fontWeight: 800, margin: '4px 0' }}>{alert.student.fullName}</h4>
                <span className="enrollment-tag">{alert.student.enrollmentNumber}</span>
                <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '6px' }}>
                  {alert.student.department} (Sem {alert.student.semester} - Div {alert.student.division})
                </p>
              </div>
            )}

            <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '10px' }}>
              {alert.message}
            </p>

            <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              ⏱️ Closing in 2s...
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS & NFC TAP SIMULATOR BAR */}
      <div className="glass-card controls-card">
        <div className="nfc-status-pill">
          <Smartphone size={18} className={nfcSupported ? 'text-green' : 'text-amber'} />
          <span>{nfcSupported ? 'Web NFC Android Reader Active' : 'Desktop NFC Reader Mode'}</span>
        </div>

        <form onSubmit={handleSimulatedSubmit} className="nfc-input-form">
          <div className="search-box size-large" style={{ flex: 1 }}>
            <Zap size={18} className="search-icon" style={{ color: '#38bdf8' }} />
            <input
              type="text"
              placeholder="Tap card or enter NFC Number (e.g. NFC-2301030400067 or 210010116001)..."
              value={simulatedTag}
              onChange={(e) => setSimulatedTag(e.target.value)}
              disabled={submittingScan}
              autoFocus
            />
          </div>
          <button type="submit" className="sky-primary-btn size-auto" disabled={submittingScan || !simulatedTag}>
            {submittingScan ? 'Processing...' : 'Simulate Card Tap'}
          </button>
        </form>
      </div>

      {/* LIVE SCANNED STUDENTS LIST */}
      <div className="glass-card table-card">
        <div className="table-card-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Scanned Attendance Log ({scans.length})</h3>
          <span className="live-pill"><Zap size={12} className="mr-4" /> Socket.IO Live Sync</span>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <RefreshCw size={28} className="spinner" />
            <p>Connecting live NFC session...</p>
          </div>
        ) : scans.length === 0 ? (
          <div className="no-files-msg" style={{ padding: '60px 20px' }}>
            <Radio size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
            <h4>Waiting for NFC Taps...</h4>
            <p>Students tap NFC card on Android phone to log attendance in real-time.</p>
          </div>
        ) : (
          <div className="scanned-students-grid">
            {scans.map((record) => {
              const st = record.student || {};
              return (
                <div key={record._id} className="scanned-student-card fade-in">
                  <div className="student-photo-wrapper">
                    <img src={st.photoUrl || '/placeholder.png'} alt={st.fullName} />
                    <span className="status-check-badge"><Check size={12} /></span>
                  </div>
                  <div className="student-card-info">
                    <h4>{st.fullName || 'Student'}</h4>
                    <p className="enrollment-tag">{st.enrollmentNumber}</p>
                    <p className="dept-tag">{st.department} (Sem {st.semester}-{st.division})</p>
                    <small className="time-tag">
                      <Clock size={12} className="mr-4" />
                      {new Date(record.scannedAt).toLocaleTimeString()}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default NfcScanner;
