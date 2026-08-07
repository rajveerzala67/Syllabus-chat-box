import React, { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { api, AuthContext, getStudentPhotoUrl } from '../context/AuthContext';
import {
  BookOpen, Clock, Calendar, CheckCircle2, AlertCircle, RefreshCw,
  ArrowRightLeft, AlertTriangle, UserCheck, Layers, FileText, Trash2
} from 'lucide-react';

const StudentLibrary = () => {
  const { user } = useContext(AuthContext);

  const [student, setStudent] = useState(null);
  const [libraryVisits, setLibraryVisits] = useState([]);
  const [currentBorrowedBooks, setCurrentBorrowedBooks] = useState([]);
  const [returnedBooks, setReturnedBooks] = useState([]);
  const [totalFine, setTotalFine] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('borrowed'); // 'borrowed', 'visits', 'returned'

  const fetchStudentLibraryData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/library/my-library');
      if (res.data.success) {
        setStudent(res.data.student);
        setLibraryVisits(res.data.libraryVisits || []);
        setCurrentBorrowedBooks(res.data.currentBorrowedBooks || []);
        setReturnedBooks(res.data.returnedBooks || []);
        setTotalFine(res.data.totalFine || 0);
      }
    } catch (err) {
      console.error('Error fetching student library history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentLibraryData();

    // Connect Socket.IO for live real-time synchronization with zero delay
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(socketUrl);

    socket.on('library:updated', () => {
      fetchStudentLibraryData();
    });

    socket.on('library:visit_updated', () => {
      fetchStudentLibraryData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Delete individual visit log
  const handleDeleteVisitRecord = async (visitId) => {
    if (!window.confirm('Delete this visit log record?')) return;
    try {
      await api.delete(`/library/visits/${visitId}`);
      fetchStudentLibraryData();
    } catch (err) {
      console.error('Error deleting visit log:', err);
    }
  };

  // Clear old test visit logs
  const handleClearVisits = async () => {
    if (window.confirm('Are you sure you want to clear all test library visit records?')) {
      try {
        await api.delete('/library/clear-visits');
        fetchStudentLibraryData();
      } catch (err) {
        console.error('Error clearing visit logs:', err);
      }
    }
  };

  return (
    <div className="container student-page-container fade-in">

      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
            <BookOpen size={32} />
          </div>
          <div>
            <h2>My Library Dashboard</h2>
            <p className="subtitle">Track your library entry & exit logs, current borrowed books, return dates, & fine status</p>
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleClearVisits}
            style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '10px' }}
            title="Wipe old test visit logs"
          >
            🧹 Clear Visit Logs
          </button>
          <button className="refresh-btn" onClick={fetchStudentLibraryData} title="Refresh Library Data">
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <RefreshCw size={28} className="spinner" style={{ marginBottom: '10px' }} />
          <p>Loading personal library record...</p>
        </div>
      ) : student ? (
        <>
          {/* STUDENT PROFILE & FINE BANNER */}
          <div className="glass-card page-header-card" style={{ display: 'block', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <img
                src={getStudentPhotoUrl(student.photoUrl)}
                alt={student.fullName}
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #38bdf8' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
                }}
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>{student.fullName}</h3>
                <p style={{ color: '#38bdf8', fontWeight: 600, margin: '4px 0' }}>
                  Enrollment: {student.enrollmentNumber} | NFC Tag: {student.nfcTagNumber}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                  {student.department} (Semester {student.semester} - Division {student.division})
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '14px 20px', borderRadius: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Active Loans</span>
                  <strong style={{ fontSize: '22px', color: '#38bdf8' }}>{currentBorrowedBooks.length} Books</strong>
                </div>

                <div style={{ background: totalFine > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: totalFine > 0 ? '1px solid #ef4444' : '1px solid #10b981', padding: '14px 20px', borderRadius: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Pending Fine</span>
                  <strong style={{ fontSize: '22px', color: totalFine > 0 ? '#f87171' : '#34d399' }}>
                    {totalFine > 0 ? `₹${totalFine}` : '₹0 (No Fine)'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* TAB SELECTION CONTROLS */}
          <div className="glass-card controls-card" style={{ marginBottom: '20px' }}>
            <div className="tabs-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className={`lecture-tab-btn today ${activeTab === 'borrowed' ? 'active' : ''}`}
                onClick={() => setActiveTab('borrowed')}
              >
                <BookOpen size={16} />
                <span>Current Borrowed Books</span>
                <span className="tab-badge-pill">{currentBorrowedBooks.length}</span>
              </button>

              <button
                className={`lecture-tab-btn upcoming ${activeTab === 'visits' ? 'active' : ''}`}
                onClick={() => setActiveTab('visits')}
              >
                <Clock size={16} />
                <span>Library Visit History</span>
                <span className="tab-badge-pill">{libraryVisits.length}</span>
              </button>

              <button
                className={`lecture-tab-btn completed ${activeTab === 'returned' ? 'active' : ''}`}
                onClick={() => setActiveTab('returned')}
              >
                <CheckCircle2 size={16} />
                <span>Returned Books</span>
                <span className="tab-badge-pill">{returnedBooks.length}</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENTS */}
          <div className="glass-card table-card">

            {/* 1. CURRENT BORROWED BOOKS */}
            {activeTab === 'borrowed' && (
              <div>
                {currentBorrowedBooks.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                    <h4>No Books Currently Borrowed</h4>
                    <p>You have zero active book loans from the college library.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Book Title</th>
                          <th>Author / Category</th>
                          <th>Issue Date</th>
                          <th>Return Deadline</th>
                          <th>Shelf</th>
                          <th>Status / Fine</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBorrowedBooks.map((tx) => {
                          const bk = tx.book || {};
                          return (
                            <tr key={tx._id}>
                              <td><strong style={{ color: '#ffffff', fontSize: '15px' }}>{bk.title || 'Book Title'}</strong></td>
                              <td>{bk.author} ({bk.category})</td>
                              <td>{new Date(tx.issueDate).toLocaleDateString()}</td>
                              <td>
                                <span style={{ color: tx.status === 'Overdue' ? '#f87171' : '#ffffff', fontWeight: 600 }}>
                                  {new Date(tx.expectedReturnDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td><span className="nfc-tag-badge">{bk.shelfNumber || 'N/A'}</span></td>
                              <td>
                                <span className={`status-badge ${tx.status === 'Overdue' ? 'absent' : 'pending'}`}>
                                  {tx.status} {tx.fineAmount > 0 ? `(Fine: ₹${tx.fineAmount})` : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. LIBRARY VISITS LOG */}
            {activeTab === 'visits' && (
              <div>
                {libraryVisits.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <Clock size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                    <h4>No Library Visit Records</h4>
                    <p>Tap your college NFC card at the library entrance scanner to record visits.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Entry Time</th>
                          <th>Exit Time</th>
                          <th>Duration</th>
                          <th>Status</th>
                          {user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'staff') && <th>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {libraryVisits.map((visit) => (
                          <tr key={visit._id}>
                            <td>{new Date(visit.entryTime).toLocaleDateString()}</td>
                            <td>
                              <span style={{ color: '#38bdf8' }}>
                                <Clock size={13} className="mr-4" />
                                {new Date(visit.entryTime).toLocaleTimeString()}
                              </span>
                            </td>
                            <td>
                              {visit.exitTime ? (
                                new Date(visit.exitTime).toLocaleTimeString()
                              ) : (
                                <span style={{ color: '#34d399', fontWeight: 600 }}>Active</span>
                              )}
                            </td>
                            <td>
                              {visit.durationMinutes ? `${visit.durationMinutes} Mins` : '--'}
                            </td>
                            <td>
                              {(!visit.exitTime && (visit.status === 'Check-In' || visit.status === 'Inside Library')) ? (
                                <span className="status-badge present" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid #10b981' }}>
                                  Check-In
                                </span>
                              ) : (
                                <span className="status-badge completed" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7' }}>
                                  Check-Out
                                </span>
                              )}
                            </td>
                            {user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'staff') && (
                              <td>
                                <button
                                  className="outline-btn"
                                  style={{ padding: '5px 10px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                                  onClick={() => handleDeleteVisitRecord(visit._id)}
                                  title="Delete Visit Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. RETURNED BOOKS HISTORY */}
            {activeTab === 'returned' && (
              <div>
                {returnedBooks.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <CheckCircle2 size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                    <h4>No Past Returned Books</h4>
                    <p>Returned book records will appear here.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Book Title</th>
                          <th>Issue Date</th>
                          <th>Returned Date</th>
                          <th>Late Days</th>
                          <th>Fine Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnedBooks.map((tx) => {
                          const bk = tx.book || {};
                          return (
                            <tr key={tx._id}>
                              <td><strong>{bk.title || 'Book Title'}</strong></td>
                              <td>{new Date(tx.issueDate).toLocaleDateString()}</td>
                              <td>{tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : 'Returned'}</td>
                              <td>{tx.lateDays || 0} Days</td>
                              <td>
                                {tx.fineAmount > 0 ? (
                                  <span style={{ color: tx.finePaid ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                                    ₹{tx.fineAmount} ({tx.finePaid ? 'Paid' : 'Unpaid'})
                                  </span>
                                ) : (
                                  <span style={{ color: '#34d399' }}>No Fine</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      ) : (
        <div className="glass-card table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#f87171', marginBottom: '14px' }} />
          <h3>Student Profile Not Linked</h3>
          <p style={{ color: '#94a3b8' }}>Your user account is not linked to a student profile in the database.</p>
        </div>
      )}

    </div>
  );
};

export default StudentLibrary;
