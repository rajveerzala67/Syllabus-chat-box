import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Smartphone, CheckCircle2, AlertCircle, RefreshCw, X, Zap, Radio,
  UserCheck, ArrowRightLeft, Clock, BookOpen, AlertTriangle, Check
} from 'lucide-react';

const LibraryScanner = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Scanner & Student Profile State
  const [scannedStudent, setScannedStudent] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [activeVisit, setActiveVisit] = useState(null);
  const [pendingFine, setPendingFine] = useState(0);

  // Web NFC & Input State
  const [scanMode, setScanMode] = useState('auto'); // 'auto' (phone tap) or 'manual' (enrollment input)
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [simulatedTag, setSimulatedTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [capturedTagBanner, setCapturedTagBanner] = useState('');

  // Books catalog state for quick issue modal
  const [availableBooks, setAvailableBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Toast / Alert Notification
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  // Multi-Student Parallel Live Activity Stream (Recent 4 Scans)
  const [recentScansStream, setRecentScansStream] = useState([]);

  // Fetch available books for issue modal
  const fetchAvailableBooks = async () => {
    try {
      const res = await api.get('/library/books', { params: { status: 'Available' } });
      setAvailableBooks(res.data.books || []);
    } catch (err) {
      console.error('Error fetching available books:', err);
    }
  };

  useEffect(() => {
    fetchAvailableBooks();

    // Check if browser supports Web NFC (Android Chrome)
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      startWebNfcReader();
    }

    // Socket.IO sync for live parallel library scans
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(socketUrl);

    socket.on('library:scanned', (data) => {
      if (data.student) {
        setRecentScansStream((prev) => {
          const newItem = {
            id: `${data.student._id}_${Date.now()}`,
            student: data.student,
            actionType: data.actionType || (data.activeVisit ? 'CHECKED_IN' : 'CHECKED_OUT'),
            time: new Date().toLocaleTimeString()
          };
          return [newItem, ...prev.filter(item => item.student._id !== data.student._id)].slice(0, 4);
        });
      }

      if (scannedStudent && data.student && scannedStudent._id === data.student._id) {
        setScannedStudent(data.student);
        setActiveVisit(data.activeVisit);
        setPendingFine(data.pendingFine || 0);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [scannedStudent?._id]);

  // 4-Second Throttle tracking per tag
  const lastTagTapMapRef = React.useRef({});

  // Web NFC Reader setup with W3C NDEF Text decoding, 4s throttling & haptic feedback
  const startWebNfcReader = async () => {
    try {
      if (!('NDEFReader' in window)) {
        showToast('error', 'Web NFC is not supported on this browser/device.');
        return;
      }

      const ndef = new window.NDEFReader();
      await ndef.scan();
      setIsScanning(true);
      showToast('success', '⚡ Web NFC Reader Activated! Tap card on back of phone.');

      ndef.addEventListener('reading', ({ serialNumber, message }) => {
        let scannedTagValue = '';

        if (message && message.records && message.records.length > 0) {
          for (const record of message.records) {
            try {
              let text = '';
              if (record.recordType === 'text') {
                const dataView = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
                const statusByte = dataView.getUint8(0);
                const langLength = statusByte & 0x3f;
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                const textBytes = new Uint8Array(
                  record.data.buffer,
                  record.data.byteOffset + 1 + langLength,
                  record.data.byteLength - 1 - langLength
                );
                text = textDecoder.decode(textBytes).trim();
              } else {
                const textDecoder = new TextDecoder();
                text = textDecoder.decode(record.data).trim();
              }

              const clean = text.replace(/^[\x00-\x1F\x7F-\x9F]+/, '').replace(/^(en|es|fr|de)/i, '').trim();
              if (clean) {
                scannedTagValue = clean;
                break;
              }
            } catch (decErr) {
              console.warn('NDEF Record decoding warning:', decErr);
            }
          }
        }

        if (!scannedTagValue && serialNumber) {
          const cleanSerial = serialNumber.replace(/:/g, '').toUpperCase();
          scannedTagValue = cleanSerial.startsWith('NFC-') ? cleanSerial : `NFC-${cleanSerial}`;
        }

        if (scannedTagValue) {
          // 4-SECOND PER-STUDENT THROTTLING
          const nowMs = Date.now();
          const lastTap = lastTagTapMapRef.current[scannedTagValue];
          if (lastTap && (nowMs - lastTap < 4000)) {
            const remainingSecs = Math.ceil((4000 - (nowMs - lastTap)) / 1000);
            showToast('warning', `⏳ Tap throttled! Wait ${remainingSecs}s for next tap.`);
            return;
          }
          lastTagTapMapRef.current[scannedTagValue] = nowMs;

          if ('vibrate' in navigator) {
            navigator.vibrate([120, 80, 120]);
          }
          setCapturedTagBanner(scannedTagValue);
          setSimulatedTag(scannedTagValue);
          processNfcScan(scannedTagValue);
        }
      });
    } catch (error) {
      console.warn('Web NFC reading error:', error);
      setIsScanning(false);
      showToast('error', `Web NFC Error: ${error.message || 'Permission denied or NFC unavailable'}`);
    }
  };

  // Process NFC Scan payload with backend (Entry / Exit Toggle + 4s Throttle)
  const processNfcScan = async (nfcCardNumber) => {
    if (!nfcCardNumber.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/library/scan-nfc', { nfcCardNumber: nfcCardNumber.trim() });
      if (res.data.throttled) {
        showToast('warning', res.data.message || '⏳ Tap throttled. Please wait 4 seconds.');
        setLoading(false);
        return;
      }

      setScannedStudent(res.data.student);
      setBorrowedBooks(res.data.currentBorrowedBooks || []);
      setActiveVisit(res.data.activeVisit);
      setPendingFine(res.data.pendingFine || 0);
      setSimulatedTag('');

      if (res.data.student) {
        setRecentScansStream((prev) => {
          const newItem = {
            id: `${res.data.student._id}_${Date.now()}`,
            student: res.data.student,
            actionType: res.data.actionType || (res.data.activeVisit ? 'CHECKED_IN' : 'CHECKED_OUT'),
            time: new Date().toLocaleTimeString()
          };
          return [newItem, ...prev.filter(item => item.student._id !== res.data.student._id)].slice(0, 4);
        });
      }

      showToast('success', res.data.message || `NFC Card Recognized: ${res.data.student.fullName}`);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'No student profile found for scanned card.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedSubmit = (e) => {
    e.preventDefault();
    if (simulatedTag) {
      processNfcScan(simulatedTag);
    }
  };

  // Perform Library Check In
  const handleCheckIn = async () => {
    if (!scannedStudent) return;
    try {
      const res = await api.post('/library/check-in', { studentId: scannedStudent._id });
      showToast('success', res.data.message || 'Check IN completed!');
      processNfcScan(scannedStudent.nfcTagNumber || scannedStudent.enrollmentNumber);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Check IN failed');
    }
  };

  // Perform Library Check Out
  const handleCheckOut = async () => {
    if (!scannedStudent) return;
    try {
      const res = await api.post('/library/check-out', { studentId: scannedStudent._id });
      showToast('success', res.data.message || 'Check OUT completed!');
      processNfcScan(scannedStudent.nfcTagNumber || scannedStudent.enrollmentNumber);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Check OUT failed');
    }
  };

  // Perform Book Issue for Scanned Student
  const handleIssueBookSubmit = async (e) => {
    e.preventDefault();
    if (!scannedStudent || !selectedBookId) {
      showToast('error', 'Please select a book to issue');
      return;
    }
    try {
      const res = await api.post('/library/issue-book', {
        studentId: scannedStudent._id,
        bookId: selectedBookId,
        expectedReturnDate
      });
      showToast('success', res.data.message || 'Book issued successfully!');
      setShowIssueModal(false);
      setSelectedBookId('');

      // Reload borrowed books & visit status WITHOUT triggering 2nd NFC tap check-out toggle!
      const reloadRes = await api.post('/library/scan-nfc', {
        nfcCardNumber: scannedStudent.nfcTagNumber || scannedStudent.enrollmentNumber,
        isReloadOnly: true
      });
      if (reloadRes.data.student) {
        setBorrowedBooks(reloadRes.data.currentBorrowedBooks || []);
        setActiveVisit(reloadRes.data.activeVisit);
        setPendingFine(reloadRes.data.pendingFine || 0);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to issue book');
    }
  };

  // Perform Book Return
  const handleReturnBook = async (transactionId) => {
    try {
      const res = await api.post('/library/return-book', { transactionId });
      showToast('success', res.data.message || 'Book returned successfully!');

      // Reload borrowed books & visit status WITHOUT triggering 2nd NFC tap check-out toggle!
      const reloadRes = await api.post('/library/scan-nfc', {
        nfcCardNumber: scannedStudent.nfcTagNumber || scannedStudent.enrollmentNumber,
        isReloadOnly: true
      });
      if (reloadRes.data.student) {
        setBorrowedBooks(reloadRes.data.currentBorrowedBooks || []);
        setActiveVisit(reloadRes.data.activeVisit);
        setPendingFine(reloadRes.data.pendingFine || 0);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to return book');
    }
  };

  return (
    <div className="container student-page-container fade-in">

      {/* Toast Alert */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box" style={{ background: '#0284c7' }}>
            <Radio size={32} className="spinner" />
          </div>
          <div>
            <h2>Live NFC Library Scanner</h2>
            <p className="subtitle">Tap college NFC ID Card to instantly inspect student profile, check in/out, issue & return books</p>
          </div>
        </div>
        <div className="header-right">
          <button className="outline-btn" onClick={() => navigate('/library')}>
            <X size={16} className="mr-6" /> Return to Library Dashboard
          </button>
        </div>
      </div>

      {/* CAPTURED TAG ANIMATED NOTIFICATION BANNER */}
      {capturedTagBanner && (
        <div className="glass-card fade-in" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '16px 20px', marginBottom: '20px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Zap size={32} className="bounce-anim" style={{ color: '#fef08a' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>⚡ NFC TAG CAPTURED SUCCESSFULLY!</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '14px', opacity: 0.95 }}>Tag Payload: <strong style={{ color: '#fef08a', fontFamily: 'monospace', fontSize: '16px' }}>{capturedTagBanner}</strong></p>
            </div>
          </div>
          <button onClick={() => setCapturedTagBanner('')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* MULTI-STUDENT PARALLEL REAL-TIME ACTIVITY STREAM */}
      {recentScansStream.length > 0 && (
        <div className="glass-card fade-in" style={{ padding: '16px 20px', marginBottom: '20px', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 12px #38bdf8' }} className="spinner" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px' }}>
                ⚡ Parallel Live NFC Scans Activity Stream ({recentScansStream.length})
              </h4>
            </div>
            <span style={{ fontSize: '12px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              Parallel Multi-Sync Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {recentScansStream.map((item) => (
              <div
                key={item.id}
                className="fade-in"
                onClick={() => setScannedStudent(item.student)}
                style={{
                  background: item.actionType === 'CHECKED_IN' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                  border: `1px solid ${item.actionType === 'CHECKED_IN' ? '#10b981' : '#0284c7'}`,
                  padding: '12px 14px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: item.actionType === 'CHECKED_IN' ? '0 4px 16px rgba(16, 185, 129, 0.15)' : '0 4px 16px rgba(56, 189, 248, 0.15)'
                }}
              >
                <img
                  src={item.student?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80'}
                  alt={item.student?.fullName}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.student?.fullName}
                  </h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span className={`status-badge ${item.actionType === 'CHECKED_IN' ? 'present' : 'completed'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {item.actionType === 'CHECKED_IN' ? 'Check-In' : 'Check-Out'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODE TOGGLER SWITCH */}
      <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.65)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)', marginBottom: '20px', gap: '8px' }}>
        <button
          type="button"
          onClick={() => {
            setScanMode('auto');
            if (nfcSupported && !isScanning) startWebNfcReader();
          }}
          style={{
            flex: 1,
            padding: '12px 18px',
            borderRadius: '12px',
            border: 'none',
            background: scanMode === 'auto' ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'transparent',
            color: scanMode === 'auto' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: scanMode === 'auto' ? '0 4px 16px rgba(2, 132, 199, 0.4)' : 'none'
          }}
        >
          <Radio size={18} className={scanMode === 'auto' && isScanning ? 'spinner' : ''} />
          <span>⚡ Auto NFC Scan (Phone Tap)</span>
        </button>

        <button
          type="button"
          onClick={() => setScanMode('manual')}
          style={{
            flex: 1,
            padding: '12px 18px',
            borderRadius: '12px',
            border: 'none',
            background: scanMode === 'manual' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: scanMode === 'manual' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: scanMode === 'manual' ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none'
          }}
        >
          <Zap size={18} />
          <span>⌨️ Manual Enrollment Entry</span>
        </button>
      </div>

      {/* MODE 1: AUTO NFC SCAN MODE */}
      {scanMode === 'auto' ? (
        <div className="glass-card controls-card fade-in" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: isScanning ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: isScanning ? '#38bdf8' : '#f59e0b', marginBottom: '14px', border: `2px solid ${isScanning ? '#38bdf8' : '#f59e0b'}` }}>
            <Radio size={40} className={isScanning ? 'spinner' : ''} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            {isScanning ? '⚡ Auto NFC Scan ACTIVE' : '📱 Activate Phone NFC Reader'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px auto' }}>
            {isScanning
              ? 'Hold student NFC ID Card against the back of your phone. The phone will automatically capture the tag, vibrate, and pull up student details.'
              : 'Tap the button below to grant permission and start automatic NFC card reading on your phone.'}
          </p>

          <button
            type="button"
            className="sky-primary-btn size-auto"
            onClick={startWebNfcReader}
            style={{ padding: '12px 28px', fontSize: '15px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Radio size={18} className={isScanning ? 'spinner' : ''} />
            {isScanning ? '⚡ Reader Active — Re-trigger Scan' : '📱 Activate Phone NFC Reader'}
          </button>
        </div>
      ) : (
        /* MODE 2: MANUAL ENROLLMENT ENTRY MODE */
        <div className="glass-card controls-card fade-in">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>⌨️ Manual Enrollment / NFC Entry</h3>
            <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0 }}>Type or paste student Enrollment Number (e.g. 2301030400067) or NFC Tag ID.</p>
          </div>

          <form onSubmit={handleSimulatedSubmit} className="nfc-input-form">
            <div className="search-box size-large" style={{ flex: 1 }}>
              <Zap size={18} className="search-icon" style={{ color: '#38bdf8' }} />
              <input
                type="text"
                placeholder="Enter Enrollment Number (e.g. 2301030400067)..."
                value={simulatedTag}
                onChange={(e) => setSimulatedTag(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <button type="submit" className="sky-primary-btn size-auto" disabled={loading || !simulatedTag}>
              {loading ? 'Searching...' : 'Scan / Search Student'}
            </button>
          </form>
        </div>
      )}

      {/* SCANNED STUDENT DETAILS CARD */}
      {scannedStudent ? (
        <div className="glass-card page-header-card fade-in" style={{ display: 'block', padding: '24px' }}>
          
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px' }}>
            <img
              src={scannedStudent.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80'}
              alt={scannedStudent.fullName}
              style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #38bdf8' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
              }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>{scannedStudent.fullName}</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="enrollment-tag" style={{ fontSize: '14px', padding: '4px 12px' }}>{scannedStudent.enrollmentNumber}</span>
                <span className="dept-tag" style={{ fontSize: '13px' }}>{scannedStudent.department} (Sem {scannedStudent.semester} - Div {scannedStudent.division})</span>
                <span className="nfc-tag-badge">NFC: {scannedStudent.nfcTagNumber}</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px', margin: '8px 0 0 0' }}>
                Contact: {scannedStudent.email} | Phone: {scannedStudent.mobileNumber}
              </p>
            </div>

            {/* Status Badge & Primary Actions */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                {activeVisit ? (
                  <span className="status-badge present" style={{ fontSize: '14px', padding: '8px 16px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid #10b981' }}>
                    <UserCheck size={16} className="mr-6" /> Check-In (Entry: {new Date(activeVisit.entryTime).toLocaleTimeString()})
                  </span>
                ) : (
                  <span className="status-badge completed" style={{ fontSize: '14px', padding: '8px 16px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7' }}>
                    Check-Out
                  </span>
                )}
              </div>

              {pendingFine > 0 && (
                <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '14px' }}>
                  ⚠️ Pending Fine: ₹{pendingFine}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                {activeVisit ? (
                  <button className="outline-btn" style={{ borderColor: '#ef4444', color: '#f87171' }} onClick={handleCheckOut}>
                    Check Out Student
                  </button>
                ) : (
                  <button className="sky-primary-btn size-auto" onClick={handleCheckIn}>
                    <CheckCircle2 size={16} className="mr-6" /> Check In Student
                  </button>
                )}

                <button className="primary-btn size-auto" onClick={() => setShowIssueModal(true)}>
                  <BookOpen size={16} className="mr-6" /> Issue Book
                </button>
              </div>
            </div>
          </div>

          {/* BORROWED BOOKS SECTION */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              Current Borrowed Books ({borrowedBooks.length})
            </h4>

            {borrowedBooks.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No books currently issued to this student.</p>
            ) : (
              <div className="table-responsive">
                <table className="sky-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>ISBN / Author</th>
                      <th>Issued Date</th>
                      <th>Expected Return</th>
                      <th>Status / Late Days</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedBooks.map((tx) => {
                      const bk = tx.book || {};
                      return (
                        <tr key={tx._id}>
                          <td><strong>{bk.title || 'Book Title'}</strong></td>
                          <td>{bk.isbn} (By {bk.author})</td>
                          <td>{new Date(tx.issueDate).toLocaleDateString()}</td>
                          <td>
                            <span style={{ color: tx.status === 'Overdue' ? '#f87171' : '#ffffff' }}>
                              {new Date(tx.expectedReturnDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${tx.status === 'Overdue' ? 'absent' : 'pending'}`}>
                              {tx.status} {tx.lateDays > 0 ? `(${tx.lateDays} Days Late)` : ''}
                            </span>
                          </td>
                          <td>
                            <button className="sky-primary-btn size-auto" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleReturnBook(tx._id)}>
                              Return Book
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="glass-card table-card" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Radio size={56} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>Waiting for Student NFC Card Scan...</h3>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '8px auto 0 auto' }}>
            Tap student college ID card on Web NFC mobile reader or enter the NFC Tag / Enrollment Number above to retrieve profile details instantly.
          </p>
        </div>
      )}

      {/* QUICK ISSUE BOOK MODAL */}
      {showIssueModal && scannedStudent && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal modal-large fade-in">
            <button className="modal-close-btn" onClick={() => setShowIssueModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-step-header">
              <div className="modal-icon-badge" style={{ background: '#0284c7' }}>
                <BookOpen size={26} />
              </div>
              <h3>Issue Book to {scannedStudent.fullName}</h3>
              <p>Select an available book from the library catalog</p>
            </div>

            <form onSubmit={handleIssueBookSubmit} className="student-modal-form-container">
              <div className="sky-input-group full-width" style={{ marginBottom: '16px' }}>
                <label>Select Book from Available Catalog *</label>
                <select
                  className="sky-select"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  required
                >
                  <option value="">-- Select Book --</option>
                  {availableBooks.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.title} by {b.author} (Shelf: {b.shelfNumber} - Copies Avail: {b.availableCopies})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sky-input-group full-width" style={{ marginBottom: '20px' }}>
                <label>Expected Return Deadline *</label>
                <input
                  type="date"
                  className="sky-input"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-submit-actions">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowIssueModal(false)}>
                  <X size={16} /> Cancel
                </button>
                <button type="submit" className="sky-primary-btn size-auto" disabled={!selectedBookId}>
                  Confirm Book Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LibraryScanner;
