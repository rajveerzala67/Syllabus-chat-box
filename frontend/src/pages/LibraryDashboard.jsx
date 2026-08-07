import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, AuthContext, getStudentPhotoUrl } from '../context/AuthContext';
import {
  BookOpen, Plus, Search, RefreshCw, X, CheckCircle2, AlertCircle,
  Calendar, Layers, MapPin, Smartphone, Check, Lock, Trash2, Edit3,
  Clock, ArrowRightLeft, DollarSign, UserCheck, AlertTriangle, Filter, Tag, Download
} from 'lucide-react';

const CATEGORIES = [
  'Computer Science & IT',
  'Electronics & Electrical',
  'Mechanical Engineering',
  'Civil Engineering',
  'Mathematics & Science',
  'Management & Humanities',
  'General Fiction & Reference'
];

const LibraryDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Active Main Tab: 'books', 'transactions', 'inside', 'overdue'
  const [activeTab, setActiveTab] = useState('books');

  // Stats
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalCopies: 0,
    availableCopies: 0,
    totalIssued: 0,
    totalOverdue: 0,
    insideLibraryCount: 0
  });

  // Data Lists
  const [books, setBooks] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [bookSearch, setBookSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [txSearch, setTxSearch] = useState('');

  // Modals
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Book Form State
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: CATEGORIES[0],
    publisher: '',
    edition: '1st Edition',
    totalCopies: 1,
    shelfNumber: 'A-101'
  });

  // Issue Book Form State
  const [issueForm, setIssueForm] = useState({
    studentNfc: '',
    studentId: '',
    studentName: '',
    bookId: '',
    expectedReturnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Dashboard Stats & Transactions
      const statsRes = await api.get('/library/dashboard-stats');
      setStats(statsRes.data.stats || {});
      setActiveVisits(statsRes.data.activeVisits || []);
      setTransactions(statsRes.data.recentTransactions || []);
      setOverdueList(statsRes.data.overdueTransactions || []);

      // Fetch Books Catalog
      const booksRes = await api.get('/library/books', {
        params: { search: bookSearch, category: categoryFilter }
      });
      setBooks(booksRes.data.books || []);
    } catch (err) {
      console.error('Error loading library data:', err);
      showToast('error', err.response?.data?.message || 'Failed to load library dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Socket.IO real-time sync for live library dashboard
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(socketUrl);

    socket.on('library:updated', () => {
      fetchDashboardData();
    });

    socket.on('library:visit_updated', () => {
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, [bookSearch, categoryFilter]);

  // Handle Add/Edit Book Form Input
  const handleBookInput = (e) => {
    const { name, value } = e.target;
    setBookForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit Add / Edit Book
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBook) {
        await api.put(`/library/books/${editingBook._id}`, bookForm);
        showToast('success', 'Book details updated successfully!');
      } else {
        await api.post('/library/books', bookForm);
        showToast('success', 'New book added to library catalog!');
      }
      setShowAddBookModal(false);
      setEditingBook(null);
      resetBookForm();
      fetchDashboardData();
    } catch (err) {
      console.error('Book save error:', err);
      showToast('error', err.response?.data?.message || 'Failed to save book details');
    } finally {
      setSubmitting(false);
    }
  };

  const resetBookForm = () => {
    setBookForm({
      title: '',
      author: '',
      isbn: '',
      category: CATEGORIES[0],
      publisher: '',
      edition: '1st Edition',
      totalCopies: 1,
      shelfNumber: 'A-101'
    });
  };

  const handleEditClick = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || CATEGORIES[0],
      publisher: book.publisher || '',
      edition: book.edition || '1st Edition',
      totalCopies: book.totalCopies || 1,
      availableCopies: book.availableCopies || 1,
      shelfNumber: book.shelfNumber || 'A-101'
    });
    setShowAddBookModal(true);
  };

  const handleDeleteBook = async (bookId, bookTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${bookTitle}" from the library catalog?`)) {
      return;
    }
    try {
      await api.delete(`/library/books/${bookId}`);
      showToast('success', 'Book removed from catalog');
      fetchDashboardData();
    } catch (err) {
      console.error('Delete book error:', err);
      showToast('error', err.response?.data?.message || 'Failed to delete book');
    }
  };

  // Search student via NFC for issuing book
  const handleStudentScanForIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.studentNfc.trim()) return;
    try {
      const res = await api.post('/library/scan-nfc', { nfcCardNumber: issueForm.studentNfc });
      setIssueForm(prev => ({
        ...prev,
        studentId: res.data.student._id,
        studentName: `${res.data.student.fullName} (${res.data.student.enrollmentNumber})`
      }));
      showToast('success', `Student identified: ${res.data.student.fullName}`);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Student profile not found');
    }
  };

  // Submit Issue Book
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.studentId || !issueForm.bookId) {
      showToast('error', 'Please select both a valid student and a book to issue.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/library/issue-book', {
        studentId: issueForm.studentId,
        bookId: issueForm.bookId,
        expectedReturnDate: issueForm.expectedReturnDate
      });
      showToast('success', 'Book issued successfully!');
      setShowIssueModal(false);
      setIssueForm({
        studentNfc: '',
        studentId: '',
        studentName: '',
        bookId: '',
        expectedReturnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Issue book error:', err);
      showToast('error', err.response?.data?.message || 'Failed to issue book');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Book Return
  const handleReturnBook = async (transactionId) => {
    if (!window.confirm('Confirm returning this book to the library?')) return;
    try {
      const res = await api.post('/library/return-book', { transactionId });
      showToast('success', res.data.message || 'Book returned successfully!');
      fetchDashboardData();
    } catch (err) {
      console.error('Return error:', err);
      showToast('error', err.response?.data?.message || 'Failed to return book');
    }
  };

  // Handle Fine Payment
  const handlePayFine = async (transactionId) => {
    try {
      await api.put(`/library/transactions/${transactionId}/pay-fine`);
      showToast('success', 'Fine marked as PAID');
      fetchDashboardData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to process payment');
    }
  };

  // Handle Check-Out from Inside list
  const handleCheckOutStudent = async (studentId, studentName) => {
    try {
      const res = await api.post('/library/check-out', { studentId });
      showToast('success', res.data.message || `${studentName} checked OUT.`);
      fetchDashboardData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Check out failed');
    }
  };

  // Handle Delete Library Visit Record
  const handleDeleteVisitRecord = async (visitId) => {
    if (!window.confirm('Delete this library visit log record?')) return;
    try {
      await api.delete(`/library/visits/${visitId}`);
      showToast('success', 'Visit log record deleted');
      fetchDashboardData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete visit log');
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
          <div className="header-icon-box" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
            <BookOpen size={32} />
          </div>
          <div>
            <h2>Smart NFC Library Management System</h2>
            <p className="subtitle">Manage books catalog, student check-in / check-out, NFC scans, issues, returns, & fines</p>
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="sky-primary-btn size-auto" onClick={() => navigate('/library-scanner')}>
            <Smartphone size={18} className="mr-6" /> Open NFC Scanner
          </button>
          <button className="primary-btn size-auto" onClick={() => { resetBookForm(); setEditingBook(null); setShowAddBookModal(true); }}>
            <Plus size={18} className="mr-6" /> Add Book
          </button>
          <button className="outline-btn" onClick={() => setShowIssueModal(true)}>
            <ArrowRightLeft size={16} className="mr-6" /> Issue Book
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="dashboard-metrics-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div className="glass-card metric-card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '14px', borderRadius: '14px' }}>
            <BookOpen size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{stats.totalBooks}</h4>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Total Titles ({stats.totalCopies} copies)</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '14px', borderRadius: '14px' }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{stats.availableCopies}</h4>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Available Copies</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '14px', borderRadius: '14px' }}>
            <ArrowRightLeft size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{stats.totalIssued}</h4>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Currently Issued</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '14px', borderRadius: '14px' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: stats.totalOverdue > 0 ? '#f87171' : '#ffffff' }}>{stats.totalOverdue}</h4>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Overdue Loans</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '14px', borderRadius: '14px' }}>
            <UserCheck size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{stats.insideLibraryCount}</h4>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Students Inside</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="glass-card controls-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="tabs-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={`lecture-tab-btn today ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <BookOpen size={16} />
            <span>Books Catalog</span>
            <span className="tab-badge-pill">{books.length}</span>
          </button>

          <button
            className={`lecture-tab-btn upcoming ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <ArrowRightLeft size={16} />
            <span>Transactions</span>
            <span className="tab-badge-pill">{transactions.length}</span>
          </button>

          <button
            className={`lecture-tab-btn completed ${activeTab === 'inside' ? 'active' : ''}`}
            onClick={() => setActiveTab('inside')}
          >
            <UserCheck size={16} />
            <span>Students Inside</span>
            <span className="tab-badge-pill">{activeVisits.length}</span>
          </button>

          <button
            className={`lecture-tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveTab('overdue')}
            style={activeTab === 'overdue' ? { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #f87171' } : {}}
          >
            <AlertTriangle size={16} />
            <span>Overdue Loans</span>
            <span className="tab-badge-pill" style={{ background: '#ef4444', color: '#ffffff' }}>{overdueList.length}</span>
          </button>
        </div>

        <button className="refresh-btn" onClick={fetchDashboardData} title="Refresh Library Data">
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {/* TAB CONTENTS */}
      <div className="glass-card table-card">
        {loading ? (
          <div className="loading-spinner">
            <RefreshCw size={28} className="spinner" />
            <p>Loading library catalog...</p>
          </div>
        ) : (
          <>
            {/* 1. BOOKS CATALOG TAB */}
            {activeTab === 'books' && (
              <div>
                <div className="controls-card" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', background: 'transparent' }}>
                  <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search books by title, author, ISBN, or shelf number..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                    />
                    {bookSearch && (
                      <button className="clear-search-btn" onClick={() => setBookSearch('')}>
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="sky-select filter-select"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {books.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                    <h4>No Books Found</h4>
                    <p>Add new books to the catalog or clear search filters.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Title & Author</th>
                          <th>ISBN</th>
                          <th>Category</th>
                          <th>Shelf</th>
                          <th>Copies (Avail/Total)</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {books.map((b) => (
                          <tr key={b._id}>
                            <td>
                              <div>
                                <strong style={{ color: '#ffffff', fontSize: '15px' }}>{b.title}</strong>
                                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '2px 0 0 0' }}>By {b.author} ({b.edition})</p>
                              </div>
                            </td>
                            <td><span className="enrollment-badge">{b.isbn}</span></td>
                            <td>{b.category}</td>
                            <td><span className="nfc-tag-badge">{b.shelfNumber}</span></td>
                            <td>
                              <span style={{ fontWeight: 700, color: b.availableCopies > 0 ? '#34d399' : '#f87171' }}>
                                {b.availableCopies} / {b.totalCopies}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${b.availableCopies > 0 ? 'present' : 'absent'}`}>
                                {b.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="outline-btn" style={{ padding: '6px 12px' }} onClick={() => handleEditClick(b)}>
                                  <Edit3 size={14} />
                                </button>
                                <button className="outline-btn" style={{ padding: '6px 12px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }} onClick={() => handleDeleteBook(b._id, b.title)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div>
                {transactions.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <ArrowRightLeft size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                    <h4>No Transactions Found</h4>
                    <p>Issued and returned book history will appear here.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Book Title</th>
                          <th>Issued Date</th>
                          <th>Return Deadline</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => {
                          const st = tx.student || {};
                          const bk = tx.book || {};
                          return (
                            <tr key={tx._id}>
                              <td>
                                <div className="student-profile-cell">
                                  <img src={getStudentPhotoUrl(st.photoUrl)} alt={st.fullName} className="student-avatar-thumb" />
                                  <div>
                                    <span className="student-name-text">{st.fullName || 'Student'}</span>
                                    <span className="enrollment-tag" style={{ display: 'block', fontSize: '11px' }}>{st.enrollmentNumber}</span>
                                  </div>
                                </div>
                              </td>
                              <td><strong>{bk.title || 'Book Title'}</strong></td>
                              <td>{new Date(tx.issueDate).toLocaleDateString()}</td>
                              <td>
                                <span style={{ color: new Date() > new Date(tx.expectedReturnDate) && tx.status !== 'Returned' ? '#f87171' : '#ffffff' }}>
                                  {new Date(tx.expectedReturnDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${tx.status === 'Returned' ? 'present' : tx.status === 'Overdue' ? 'absent' : 'pending'}`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td>
                                {tx.status !== 'Returned' ? (
                                  <button className="sky-primary-btn size-auto" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleReturnBook(tx._id)}>
                                    Return Book
                                  </button>
                                ) : tx.fineAmount > 0 && !tx.finePaid ? (
                                  <button className="outline-btn" style={{ borderColor: '#eab308', color: '#eab308', padding: '6px 12px', fontSize: '13px' }} onClick={() => handlePayFine(tx._id)}>
                                    Pay Fine (₹{tx.fineAmount})
                                  </button>
                                ) : (
                                  <span style={{ color: '#34d399', fontSize: '13px', fontWeight: 600 }}>Completed</span>
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

            {/* 3. STUDENTS INSIDE TAB */}
            {activeTab === 'inside' && (
              <div>
                {activeVisits.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <UserCheck size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                    <h4>No Students Inside Library</h4>
                    <p>Students tap NFC card at scanner entrance to check in.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Enrollment No</th>
                          <th>Dept & Semester</th>
                          <th>Entry Time</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeVisits.map((visit) => {
                          const st = visit.student || {};
                          return (
                            <tr key={visit._id}>
                              <td>
                                <div className="student-profile-cell">
                                  <img src={getStudentPhotoUrl(st.photoUrl)} alt={st.fullName} className="student-avatar-thumb" />
                                  <span className="student-name-text">{st.fullName || 'Student'}</span>
                                </div>
                              </td>
                              <td><span className="enrollment-badge">{st.enrollmentNumber || 'N/A'}</span></td>
                              <td>{st.department} (Sem {st.semester})</td>
                              <td>
                                <span style={{ color: '#38bdf8' }}>
                                  <Clock size={13} className="mr-4" />
                                  {new Date(visit.entryTime).toLocaleTimeString()}
                                </span>
                              </td>
                              <td><span className="status-badge present">Inside Library</span></td>
                              <td>
                                <button className="outline-btn" style={{ borderColor: '#ef4444', color: '#f87171', padding: '6px 12px' }} onClick={() => handleCheckOutStudent(st._id, st.fullName)}>
                                  Check Out
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
            )}

            {/* 4. OVERDUE LOANS TAB */}
            {activeTab === 'overdue' && (
              <div>
                {overdueList.length === 0 ? (
                  <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                    <CheckCircle2 size={48} style={{ color: '#34d399', opacity: 0.8, marginBottom: '14px' }} />
                    <h4>No Overdue Loans</h4>
                    <p>All issued library books are within return deadlines.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="sky-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Book Title</th>
                          <th>Expected Return</th>
                          <th>Late Days</th>
                          <th>Estimated Fine</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueList.map((tx) => {
                          const st = tx.student || {};
                          const bk = tx.book || {};
                          return (
                            <tr key={tx._id}>
                              <td>
                                <div className="student-profile-cell">
                                  <img src={getStudentPhotoUrl(st.photoUrl)} alt={st.fullName} className="student-avatar-thumb" />
                                  <div>
                                    <span className="student-name-text">{st.fullName}</span>
                                    <span className="enrollment-tag" style={{ display: 'block', fontSize: '11px' }}>{st.enrollmentNumber}</span>
                                  </div>
                                </div>
                              </td>
                              <td><strong>{bk.title}</strong></td>
                              <td><span style={{ color: '#f87171' }}>{new Date(tx.expectedReturnDate).toLocaleDateString()}</span></td>
                              <td><strong style={{ color: '#f87171' }}>{tx.lateDays} Days</strong></td>
                              <td><strong style={{ color: '#fbbf24' }}>₹{tx.fineAmount}</strong></td>
                              <td>
                                <button className="sky-primary-btn size-auto" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleReturnBook(tx._id)}>
                                  Return & Fine
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
            )}
          </>
        )}
      </div>

      {/* ADD / EDIT BOOK MODAL */}
      {showAddBookModal && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal modal-large fade-in">
            <button className="modal-close-btn" onClick={() => setShowAddBookModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-step-header">
              <div className="modal-icon-badge" style={{ background: '#0284c7' }}>
                <BookOpen size={26} />
              </div>
              <h3>{editingBook ? 'Edit Book Information' : 'Add New Book to Catalog'}</h3>
              <p>Enter book details, ISBN, total copies, and assigned shelf location</p>
            </div>

            <form onSubmit={handleBookSubmit} className="student-modal-form-container">
              <div className="student-form-grid">
                <div className="sky-input-group">
                  <label>Book Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="sky-input"
                    placeholder="e.g. Operating System Concepts"
                    value={bookForm.title}
                    onChange={handleBookInput}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Author Name *</label>
                  <input
                    type="text"
                    name="author"
                    className="sky-input"
                    placeholder="e.g. Abraham Silberschatz"
                    value={bookForm.author}
                    onChange={handleBookInput}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>ISBN Number *</label>
                  <input
                    type="text"
                    name="isbn"
                    className="sky-input"
                    placeholder="e.g. 978-1118063330"
                    value={bookForm.isbn}
                    onChange={handleBookInput}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    className="sky-select"
                    value={bookForm.category}
                    onChange={handleBookInput}
                    required
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="sky-input-group">
                  <label>Publisher</label>
                  <input
                    type="text"
                    name="publisher"
                    className="sky-input"
                    placeholder="e.g. Wiley / Pearson"
                    value={bookForm.publisher}
                    onChange={handleBookInput}
                  />
                </div>

                <div className="sky-input-group">
                  <label>Edition</label>
                  <input
                    type="text"
                    name="edition"
                    className="sky-input"
                    placeholder="e.g. 10th Edition"
                    value={bookForm.edition}
                    onChange={handleBookInput}
                  />
                </div>

                <div className="sky-input-group">
                  <label>Total Copies *</label>
                  <input
                    type="number"
                    name="totalCopies"
                    className="sky-input"
                    min="1"
                    value={bookForm.totalCopies}
                    onChange={handleBookInput}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Shelf Number *</label>
                  <input
                    type="text"
                    name="shelfNumber"
                    className="sky-input"
                    placeholder="e.g. Shelf C-3"
                    value={bookForm.shelfNumber}
                    onChange={handleBookInput}
                    required
                  />
                </div>
              </div>

              <div className="form-submit-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="modal-cancel-btn" onClick={() => setShowAddBookModal(false)}>
                  <X size={16} /> Cancel
                </button>
                <button type="submit" className="sky-primary-btn size-auto" disabled={submitting}>
                  {submitting ? 'Saving...' : editingBook ? 'Update Book' : 'Add Book to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE BOOK MODAL */}
      {showIssueModal && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal modal-large fade-in">
            <button className="modal-close-btn" onClick={() => setShowIssueModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-step-header">
              <div className="modal-icon-badge" style={{ background: '#0284c7' }}>
                <ArrowRightLeft size={26} />
              </div>
              <h3>Issue Book to Student</h3>
              <p>Scan student NFC card or enter Enrollment No, select book, and set return deadline</p>
            </div>

            <form onSubmit={handleIssueSubmit} className="student-modal-form-container">

              {/* Student Search Box */}
              <div className="sky-input-group full-width" style={{ marginBottom: '16px' }}>
                <label>1. Scan / Enter Student NFC Card or Enrollment Number *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="sky-input"
                    placeholder="e.g. NFC-2301030400067 or Enrollment 2301030400067"
                    value={issueForm.studentNfc}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, studentNfc: e.target.value }))}
                  />
                  <button type="button" className="sky-primary-btn size-auto" onClick={handleStudentScanForIssue}>
                    Verify Student
                  </button>
                </div>
                {issueForm.studentName && (
                  <div style={{ color: '#34d399', fontSize: '13.5px', marginTop: '6px', fontWeight: 600 }}>
                    ✓ Selected: {issueForm.studentName}
                  </div>
                )}
              </div>

              {/* Book Select Box */}
              <div className="sky-input-group full-width" style={{ marginBottom: '16px' }}>
                <label>2. Select Book to Issue *</label>
                <select
                  className="sky-select"
                  value={issueForm.bookId}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, bookId: e.target.value }))}
                  required
                >
                  <option value="">-- Choose Book from Available Catalog --</option>
                  {books.filter(b => b.availableCopies > 0).map(b => (
                    <option key={b._id} value={b._id}>
                      {b.title} by {b.author} (Shelf {b.shelfNumber} - {b.availableCopies} available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Return Date */}
              <div className="sky-input-group full-width" style={{ marginBottom: '20px' }}>
                <label>3. Expected Return Deadline *</label>
                <input
                  type="date"
                  className="sky-input"
                  value={issueForm.expectedReturnDate}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                  required
                />
              </div>

              <div className="form-submit-actions">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowIssueModal(false)}>
                  <X size={16} /> Cancel
                </button>
                <button type="submit" className="sky-primary-btn size-auto" disabled={submitting || !issueForm.studentId || !issueForm.bookId}>
                  {submitting ? 'Issuing Book...' : 'Confirm Book Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LibraryDashboard;
