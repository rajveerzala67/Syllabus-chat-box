import React, { useState, useEffect, useContext } from 'react';
import { api, AuthContext } from '../context/AuthContext';
import { 
  CheckCircle2, XCircle, Clock, Calendar, BookOpen, Layers, RefreshCw, 
  Award, FileText, Check, AlertCircle, BarChart3, Filter, User
} from 'lucide-react';

const StudentAttendance = () => {
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overall'); // 'overall', 'daywise', 'history'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/my-attendance');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching student attendance report:', err);
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
          <p>Loading your attendance report...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.student) {
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

  // Filter daywise lectures
  const filteredDaywiseLectures = lectureHistory.filter(lec => {
    let matchesDate = true;
    if (selectedDate) {
      const lecDateStr = new Date(lec.date).toISOString().split('T')[0];
      matchesDate = lecDateStr === selectedDate;
    }
    let matchesSubject = true;
    if (selectedSubject) {
      matchesSubject = lec.subject === selectedSubject;
    }
    return matchesDate && matchesSubject;
  });

  // Calculate stats for daywise filtered selection
  const daywisePresentCount = filteredDaywiseLectures.filter(l => l.status === 'Present').length;
  const daywiseTotalCount = filteredDaywiseLectures.length;
  const daywisePercentage = daywiseTotalCount > 0 ? Math.round((daywisePresentCount / daywiseTotalCount) * 100) : 0;

  return (
    <div className="container student-page-container fade-in">

      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box" style={{ background: '#0284c7' }}>
            <BarChart3 size={32} />
          </div>
          <div>
            <h2>Student Attendance Report</h2>
            <p className="subtitle">
              Welcome, {student.fullName} ({student.enrollmentNumber}) | Department of {student.department} | Sem {student.semester}-{student.division}
            </p>
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
            <p className="stat-sub">Semester {student.semester} Lectures (Done by Teacher)</p>
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
            <p className="stat-sub">Total Marked Present by Teacher</p>
          </div>
          <div className="stat-icon-box green">
            <CheckCircle2 size={28} />
          </div>
        </div>

      </div>

      {/* TABS BAR */}
      <div className="glass-card controls-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div className="tabs-group" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button 
            className={`lecture-tab-btn overall ${activeTab === 'overall' ? 'active' : ''}`}
            onClick={() => setActiveTab('overall')}
          >
            <BarChart3 size={17} />
            <span>Overall & Subject Breakdown</span>
            <span className="tab-badge-pill">{subjectBreakdown.length}</span>
          </button>
          
          <button 
            className={`lecture-tab-btn daywise ${activeTab === 'daywise' ? 'active' : ''}`}
            onClick={() => setActiveTab('daywise')}
          >
            <Calendar size={17} />
            <span>Daywise Attendance</span>
            <span className="tab-badge-pill">{filteredDaywiseLectures.length}</span>
          </button>
          
          <button 
            className={`lecture-tab-btn history ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={17} />
            <span>All History</span>
            <span className="tab-badge-pill">{lectureHistory.length}</span>
          </button>
        </div>

        {activeTab === 'daywise' && (
          <div className="filters-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> Filter Date:
            </label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="sky-input"
              style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
            />
            {selectedDate && (
              <button 
                className="outline-btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setSelectedDate('')}
              >
                Clear Date
              </button>
            )}
            <button 
              className="outline-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </button>
          </div>
        )}
      </div>

      {/* CONTENT CARD */}
      <div className="glass-card table-card">
        
        {/* OVERALL & SUBJECT BREAKDOWN TAB */}
        {activeTab === 'overall' && (
          <div className="subject-breakdown-container">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Subject-Wise Attendance Overview</h3>
            
            {subjectBreakdown.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No subject attendance data recorded yet.</p>
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

        {/* DAYWISE ATTENDANCE TAB */}
        {activeTab === 'daywise' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                  Daywise Attendance Breakdown
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  {selectedDate 
                    ? `Showing attendance for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
                    : 'Showing all daywise lecture sessions marked by teachers'}
                </p>
              </div>

              {selectedDate && (
                <div className="user-badge" style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                    Daywise Score: {daywisePresentCount} / {daywiseTotalCount} ({daywisePercentage}%)
                  </span>
                </div>
              )}
            </div>

            {filteredDaywiseLectures.length === 0 ? (
              <div className="no-files-msg" style={{ padding: '60px 20px' }}>
                <Calendar size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                <h4>No Lectures Recorded for Selected Date</h4>
                <p>Try selecting a different date or clear the date filter.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="sky-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Lecture Time</th>
                      <th>Classroom</th>
                      <th>Teacher</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDaywiseLectures.map((lec) => (
                      <tr key={lec._id}>
                        <td>
                          <strong>{new Date(lec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        </td>
                        <td><strong>{lec.subject}</strong></td>
                        <td>{lec.startTime} - {lec.endTime}</td>
                        <td>{lec.room}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e2e8f0', fontSize: '13px' }}>
                            <User size={13} style={{ color: '#38bdf8' }} /> {lec.teacherName || 'Teacher'}
                          </span>
                        </td>
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
        )}

        {/* ALL HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="table-responsive">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>All Lecture History Log</h3>
            <table className="sky-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Room</th>
                  <th>Teacher</th>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e2e8f0', fontSize: '13px' }}>
                        <User size={13} style={{ color: '#38bdf8' }} /> {lec.teacherName || 'Teacher'}
                      </span>
                    </td>
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
