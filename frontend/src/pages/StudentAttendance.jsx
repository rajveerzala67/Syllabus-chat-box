import React, { useState, useEffect, useContext } from 'react';
import { api, AuthContext } from '../context/AuthContext';
import { 
  CheckCircle2, XCircle, Clock, Calendar, BookOpen, Layers, RefreshCw, 
  Award, FileText, Check, AlertCircle 
} from 'lucide-react';

const StudentAttendance = () => {
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'history'

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/my-attendance');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching student attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  if (loading) {
    return (
      <div className="container student-page-container fade-in">
        <div className="glass-card table-card loading-spinner" style={{ padding: '80px 20px' }}>
          <RefreshCw size={32} className="spinner" />
          <p>Loading your attendance records...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container student-page-container fade-in">
        <div className="glass-card table-card no-files-msg" style={{ padding: '80px 20px' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '14px' }} />
          <h4>Student Profile Not Linked</h4>
          <p>Your login account is not linked to a student profile. Contact your class coordinator.</p>
        </div>
      </div>
    );
  }

  const { student, overallPercentage, totalLecturesCount, totalPresentCount, subjectBreakdown, lectureHistory } = data;

  return (
    <div className="container student-page-container fade-in">

      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box" style={{ background: '#0284c7' }}>
            <Award size={32} />
          </div>
          <div>
            <h2>My Attendance Dashboard</h2>
            <p className="subtitle">Welcome, {student.fullName} ({student.enrollmentNumber}) | Sem {student.semester}-{student.division}</p>
          </div>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={fetchStudentData} title="Refresh Attendance">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* OVERALL ATTENDANCE STATS CARDS */}
      <div className="attendance-stats-grid">
        
        {/* Overall Percentage Card */}
        <div className="glass-card stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Overall Attendance</span>
            <h3 className={`stat-value ${overallPercentage >= 75 ? 'good' : 'warning'}`}>
              {overallPercentage}%
            </h3>
            <p className="stat-sub">{overallPercentage >= 75 ? '✅ Eligible for Exams (>=75%)' : '⚠️ Below 75% Requirement'}</p>
          </div>
          <div className="stat-gauge-wrapper">
            <div className={`circular-gauge ${overallPercentage >= 75 ? 'green' : 'amber'}`}>
              <span>{overallPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Total Lectures Card */}
        <div className="glass-card stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Total Conducted Lectures</span>
            <h3 className="stat-value text-sky">{totalLecturesCount}</h3>
            <p className="stat-sub">Semester {student.semester} Lectures</p>
          </div>
          <div className="stat-icon-box">
            <BookOpen size={28} />
          </div>
        </div>

        {/* Present Days Card */}
        <div className="glass-card stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Attended Lectures</span>
            <h3 className="stat-value text-green">{totalPresentCount}</h3>
            <p className="stat-sub">Total NFC Scans Recorded</p>
          </div>
          <div className="stat-icon-box green">
            <CheckCircle2 size={28} />
          </div>
        </div>

      </div>

      {/* TABS BAR */}
      <div className="glass-card controls-card">
        <div className="tabs-group" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Subject-Wise Breakdown
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Lecture History ({lectureHistory.length})
          </button>
        </div>
      </div>

      {/* CONTENT CARD */}
      <div className="glass-card table-card">
        
        {activeTab === 'summary' && (
          <div className="subject-breakdown-container">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Subject Wise Attendance Statistics</h3>
            
            {subjectBreakdown.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No subject data recorded yet.</p>
            ) : (
              <div className="subject-cards-grid">
                {subjectBreakdown.map((sb, idx) => (
                  <div key={idx} className="subject-stat-box glass-card">
                    <div className="subject-box-header">
                      <h4>{sb.subject}</h4>
                      <span className={`perc-badge ${sb.percentage >= 75 ? 'good' : 'warning'}`}>
                        {sb.percentage}%
                      </span>
                    </div>
                    
                    <div className="progress-bar-wrapper">
                      <div 
                        className={`progress-bar-fill ${sb.percentage >= 75 ? 'green' : 'amber'}`}
                        style={{ width: `${sb.percentage}%` }}
                      ></div>
                    </div>

                    <div className="subject-box-footer">
                      <span>Attended {sb.present} of {sb.total} lectures</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="table-responsive">
            <table className="sky-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Room</th>
                  <th>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {lectureHistory.map((lec) => (
                  <tr key={lec._id}>
                    <td><strong>{lec.subject}</strong></td>
                    <td>{new Date(lec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>{lec.startTime} - {lec.endTime}</td>
                    <td>{lec.room}</td>
                    <td>
                      <span className={`status-badge ${lec.status === 'Present' ? 'present' : 'absent'}`}>
                        {lec.status === 'Present' ? (
                          <><CheckCircle2 size={13} className="mr-4" /> Present</>
                        ) : (
                          <><XCircle size={13} className="mr-4" /> Absent</>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

export default StudentAttendance;
