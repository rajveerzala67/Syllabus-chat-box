import React, { useContext, useState, useEffect } from 'react';
import { AuthContext, api } from '../context/AuthContext';
import { Calendar, Clock, BookOpen, User, ClipboardList, Trash2, Plus, RefreshCw, BarChart2 } from 'lucide-react';

const SyllabusUpdater = () => {
  const { user } = useContext(AuthContext);
  const [syllabusList, setSyllabusList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [subjectName, setSubjectName] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [topic, setTopic] = useState('');

  const [showProgress, setShowProgress] = useState(false);
  const isCoordinator = user?.role === 'coordinator';

  const fetchSyllabusList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/syllabus');
      setSyllabusList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabusList();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectName || !facultyName || !date || !time || !topic) {
      alert('All fields are required');
      return;
    }

    try {
      const res = await api.post('/syllabus', {
        subjectName,
        facultyName,
        date,
        time,
        topic
      });
      setSyllabusList([res.data, ...syllabusList]);
      
      // Reset form
      setSubjectName('');
      setFacultyName('');
      setDate('');
      setTime('');
      setTopic('');
      
      alert('Syllabus update added successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error adding syllabus update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this syllabus update?')) return;
    try {
      await api.delete(`/syllabus/${id}`);
      setSyllabusList(syllabusList.filter(item => item._id !== id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove syllabus update');
    }
  };

  // Process data for dashboard summary
  const totalUpdates = syllabusList.length;

  return (
    <div className="container updates-container fade-in">
      <div className="updates-layout">
        
        {/* LEFT COLUMN: Add Form (Coordinator Only) */}
        {isCoordinator && (
          <div className="glass-card update-form-card">
            <h2>➕ Add Syllabus Update</h2>
            <form onSubmit={handleSubmit} className="form-section">
              <div className="input-group">
                <label>Subject Name</label>
                <div className="input-wrapper">
                  <BookOpen className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Enter subject name"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Faculty Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Enter faculty name"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Date</label>
                  <div className="input-wrapper">
                    <Calendar className="input-icon" size={18} />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Time</label>
                  <div className="input-wrapper">
                    <Clock className="input-icon" size={18} />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Topic Covered</label>
                <div className="input-wrapper">
                  <ClipboardList className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Enter topic covered"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="primary-btn mt-10">
                <Plus size={18} className="mr-6" /> Save Update
              </button>
            </form>
          </div>
        )}

        {/* RIGHT COLUMN: Syllabus Updates List */}
        <div className="glass-card updates-list-card">
          <div className="list-header">
            <h2>📘 Syllabus Updates Timeline</h2>
            <div className="header-actions">
              <button 
                onClick={() => setShowProgress(!showProgress)} 
                className="progress-toggle-btn"
                title="Show Progress Dashboard"
              >
                <BarChart2 size={20} />
                <span>Progress Summary</span>
              </button>
              <button 
                onClick={fetchSyllabusList} 
                className="refresh-btn"
                title="Refresh Updates"
              >
                <RefreshCw size={18} className={loading ? 'spinner' : ''} />
              </button>
            </div>
          </div>

          {showProgress && (
            <div className="progress-summary-box glass-card inner-card fade-in">
              <h3>📊 Progress Dashboard Summary</h3>
              <p><strong>Total Subjects Updates:</strong> {totalUpdates}</p>
              {totalUpdates === 0 ? (
                <p>No subjects added yet.</p>
              ) : (
                <ul className="summary-list">
                  {syllabusList.map((item) => (
                    <li key={item._id} className="summary-item">
                      <span className="summary-subject">{item.subjectName}</span>
                      <span className="summary-faculty">({item.facultyName})</span>
                      <span className="summary-topic">— {item.topic}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="timeline-list">
            {loading ? (
              <div className="loading-spinner">
                <RefreshCw className="spinner" size={24} />
                <span>Loading updates...</span>
              </div>
            ) : syllabusList.length === 0 ? (
              <p className="no-updates-msg">No syllabus updates published yet.</p>
            ) : (
              syllabusList.map((item) => {
                const formattedDate = new Date(item.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                return (
                  <div key={item._id} className="timeline-item glass-card inner-card">
                    <div className="timeline-item-header">
                      <div className="item-title">
                        <h3>{item.subjectName}</h3>
                        <span className="faculty-badge">by {item.facultyName}</span>
                      </div>
                      {isCoordinator && (
                        <button 
                          onClick={() => handleDelete(item._id)} 
                          className="delete-item-btn"
                          title="Remove update"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="timeline-item-body">
                      <p className="topic-text">
                        <strong>Topic Covered:</strong> {item.topic}
                      </p>
                    </div>

                    <div className="timeline-item-footer">
                      <span className="time-badge">
                        <Calendar size={14} className="mr-4" />
                        {formattedDate}
                      </span>
                      <span className="time-badge">
                        <Clock size={14} className="mr-4" />
                        {item.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SyllabusUpdater;
