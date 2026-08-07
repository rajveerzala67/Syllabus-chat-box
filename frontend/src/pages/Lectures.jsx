import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AuthContext } from '../context/AuthContext';
import { 
  Calendar, Clock, Plus, Play, RefreshCw, X, CheckCircle2, 
  AlertCircle, BookOpen, MapPin, Layers, Smartphone, Check, Lock, Trash2
} from 'lucide-react';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'AI & Data Science',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering'
];

const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const DIVISIONS = ['A', 'B', 'C', 'D'];

const Lectures = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Lecture Data States
  const [todayLectures, setTodayLectures] = useState([]);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [completedLectures, setCompletedLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'today', 'upcoming', 'completed'
  const [activeTab, setActiveTab] = useState('today');

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    subject: '',
    semester: '5',
    division: 'A',
    room: 'Lab 302',
    lectureNumber: '1',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    attendanceWindowMinutes: '10'
  });

  // Notifications
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lectures');
      setTodayLectures(res.data.todayLectures || []);
      setUpcomingLectures(res.data.upcomingLectures || []);
      setCompletedLectures(res.data.completedLectures || []);
    } catch (err) {
      console.error('Error fetching lectures:', err);
      showToast('error', err.response?.data?.message || 'Failed to load lectures schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/lectures', formData);
      showToast('success', res.data.message || 'Lecture scheduled successfully!');
      setShowScheduleModal(false);
      fetchLectures();
    } catch (err) {
      console.error('Schedule error:', err);
      showToast('error', err.response?.data?.message || 'Failed to schedule lecture');
    } finally {
      setSubmitting(false);
    }
  };

  // Start Attendance Session -> Navigate to NFC Scanner View
  const handleStartAttendance = async (lectureId) => {
    try {
      const res = await api.post(`/lectures/${lectureId}/start-session`);
      showToast('success', res.data.message || 'Attendance session started!');
      if (res.data.session) {
        navigate(`/nfc-scanner/${res.data.session._id}`);
      }
    } catch (err) {
      console.error('Start session error:', err);
      showToast('error', err.response?.data?.message || 'Failed to start attendance session');
    }
  };

  // Reopen Attendance Window
  const handleReopenWindow = async (lectureId) => {
    try {
      const res = await api.put(`/lectures/${lectureId}/reopen-session`, { minutes: 10 });
      showToast('success', res.data.message || 'Attendance window reopened!');
      fetchLectures();
    } catch (err) {
      console.error('Reopen error:', err);
      showToast('error', err.response?.data?.message || 'Failed to reopen attendance window');
    }
  };

  // Close Attendance Window
  const handleCloseWindow = async (lectureId) => {
    try {
      await api.put(`/lectures/${lectureId}/close-session`);
      showToast('success', 'Attendance session closed');
      fetchLectures();
    } catch (err) {
      console.error('Close error:', err);
      showToast('error', err.response?.data?.message || 'Failed to close attendance session');
    }
  };

  const handleDeleteLecture = async (lectureId, subjectName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the lecture "${subjectName}"?\n\nThis will remove the lecture and all associated attendance records permanently.`)) {
      return;
    }
    try {
      await api.delete(`/lectures/${lectureId}`);
      showToast('success', 'Lecture deleted permanently from database');
      fetchLectures();
    } catch (err) {
      console.error('Delete lecture error:', err);
      showToast('error', err.response?.data?.message || 'Failed to delete lecture');
    }
  };

  const renderLectureCards = (lecturesList, isToday = false) => {
    if (lecturesList.length === 0) {
      return (
        <div className="no-files-msg" style={{ padding: '40px 20px' }}>
          <Calendar size={42} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>No lectures found for this category.</p>
        </div>
      );
    }

    const isTeacher = user && (user.role === 'teacher' || user.role === 'admin');

    return (
      <div className="lectures-grid">
        {lecturesList.map((lecture) => (
          <div key={lecture._id} className="lecture-card glass-card">
            <div className="lecture-card-header">
              <div className="subject-info">
                <h3>{lecture.subject}</h3>
                <span className="lecture-num-tag">Lecture #{lecture.lectureNumber}</span>
              </div>
              <span className={`window-status-badge ${lecture.isAttendanceWindowOpen ? 'open' : 'closed'}`}>
                {lecture.isAttendanceWindowOpen ? (
                  <>
                    <Smartphone size={12} className="spinner mr-4" /> Live Window Open
                  </>
                ) : (
                  <>
                    <Lock size={12} className="mr-4" /> Closed
                  </>
                )}
              </span>
            </div>

            <div className="lecture-card-details">
              <div className="detail-item">
                <Layers size={15} />
                <span>Sem {lecture.semester} (Div {lecture.division})</span>
              </div>
              <div className="detail-item">
                <MapPin size={15} />
                <span>Room {lecture.room}</span>
              </div>
              <div className="detail-item">
                <Clock size={15} />
                <span>{lecture.startTime} - {lecture.endTime}</span>
              </div>
              <div className="detail-item">
                <Calendar size={15} />
                <span>{new Date(lecture.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Teacher Actions */}
            {isTeacher && (
              <div className="lecture-card-actions">
                <button 
                  className="outline-btn delete-lecture-btn" 
                  onClick={() => handleDeleteLecture(lecture._id, lecture.subject)}
                  title="Delete Lecture Permanently"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                >
                  <Trash2 size={15} />
                  <span>Delete Schedule</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container student-page-container fade-in">
      
      {/* Toast Alert Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box">
            <Calendar size={32} />
          </div>
          <div>
            <h2>Lecture Scheduling</h2>
            <p className="subtitle">Schedule class lectures, manage timetables, & prepare for future AI Attendance module</p>
          </div>
        </div>
        <div className="header-right">
          <button className="primary-btn size-auto" onClick={() => setShowScheduleModal(true)}>
            <Plus size={18} className="mr-6" />
            <span>Schedule Lecture</span>
          </button>
        </div>
      </div>

      {/* Tab Controls Bar */}
      <div className="glass-card controls-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tabs-group" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button 
            className={`lecture-tab-btn today ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <Clock size={17} />
            <span>Today's Lectures</span>
            <span className="tab-badge-pill">{todayLectures.length}</span>
          </button>

          <button 
            className={`lecture-tab-btn upcoming ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <Calendar size={17} />
            <span>Upcoming</span>
            <span className="tab-badge-pill">{upcomingLectures.length}</span>
          </button>

          <button 
            className={`lecture-tab-btn completed ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CheckCircle2 size={17} />
            <span>Completed</span>
            <span className="tab-badge-pill">{completedLectures.length}</span>
          </button>
        </div>

        <button className="refresh-btn" onClick={fetchLectures} title="Refresh Lectures">
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {/* Main Lectures Container */}
      <div className="glass-card table-card">
        {loading ? (
          <div className="loading-spinner">
            <RefreshCw size={28} className="spinner" />
            <p>Loading lecture schedules...</p>
          </div>
        ) : (
          <>
            {activeTab === 'today' && renderLectureCards(todayLectures, true)}
            {activeTab === 'upcoming' && renderLectureCards(upcomingLectures, false)}
            {activeTab === 'completed' && renderLectureCards(completedLectures, false)}
          </>
        )}
      </div>

      {/* SCHEDULE LECTURE MODAL */}
      {showScheduleModal && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal modal-large fade-in">
            <button className="modal-close-btn" onClick={() => setShowScheduleModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-step-header">
              <div className="modal-icon-badge">
                <Calendar size={26} />
              </div>
              <h3>Schedule New Class Lecture</h3>
              <p>Set subject, room, timing, & default 10-minute NFC attendance window</p>
            </div>

            <form onSubmit={handleScheduleSubmit} className="student-modal-form-container">
              <div className="student-form-grid">
                
                <div className="sky-input-group">
                  <label>Subject Name *</label>
                  <input
                    type="text"
                    name="subject"
                    className="sky-input"
                    placeholder="e.g. Data Structures & Algorithms"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Classroom / Room Number *</label>
                  <input
                    type="text"
                    name="room"
                    className="sky-input"
                    placeholder="e.g. Lab 302 / Room 104"
                    value={formData.room}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Semester *</label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="sky-select"
                    required
                  >
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>

                <div className="sky-input-group">
                  <label>Division *</label>
                  <select
                    name="division"
                    value={formData.division}
                    onChange={handleInputChange}
                    className="sky-select"
                    required
                  >
                    {DIVISIONS.map(v => <option key={v} value={v}>Division {v}</option>)}
                  </select>
                </div>

                <div className="sky-input-group">
                  <label>Lecture Number *</label>
                  <input
                    type="text"
                    name="lectureNumber"
                    className="sky-input"
                    placeholder="e.g. 1, 2, or Lab 1"
                    value={formData.lectureNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Lecture Date *</label>
                  <input
                    type="date"
                    name="date"
                    className="sky-input"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>Start Time *</label>
                  <input
                    type="text"
                    name="startTime"
                    className="sky-input"
                    placeholder="e.g. 09:00"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="sky-input-group">
                  <label>End Time *</label>
                  <input
                    type="text"
                    name="endTime"
                    className="sky-input"
                    placeholder="e.g. 10:00"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="sky-input-group full-width">
                  <label>NFC Attendance Window Duration (Minutes) *</label>
                  <input
                    type="number"
                    name="attendanceWindowMinutes"
                    className="sky-input"
                    placeholder="10"
                    value={formData.attendanceWindowMinutes}
                    onChange={handleInputChange}
                    min="1"
                    max="60"
                    required
                  />
                  <small style={{ color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    * By default, the NFC attendance window opens during the last 10 minutes of the lecture.
                  </small>
                </div>

              </div>

              <div className="form-submit-actions">
                <button 
                  type="button" 
                  className="modal-cancel-btn"
                  onClick={() => setShowScheduleModal(false)}
                >
                  <X size={16} /> Cancel
                </button>
                <button 
                  type="submit" 
                  className="sky-primary-btn size-auto"
                  disabled={submitting}
                >
                  {submitting ? 'Scheduling...' : 'Save Lecture Schedule'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Lectures;
