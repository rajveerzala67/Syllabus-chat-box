import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { 
  BarChart3, Search, Filter, RefreshCw, FileText, Download, Printer,
  Users, CheckCircle2, Calendar, Layers, MapPin, Check, X
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

const AttendanceReports = () => {
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [divFilter, setDivFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (deptFilter) params.department = deptFilter;
      if (semFilter) params.semester = semFilter;
      if (divFilter) params.division = divFilter;
      if (subjectFilter) params.subject = subjectFilter;
      if (dateFilter) params.date = dateFilter;

      const res = await api.get('/attendance/reports', { params });
      setRecords(res.data.records || []);
      setTotalCount(res.data.totalPresent || 0);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchTerm, deptFilter, semFilter, divFilter, subjectFilter, dateFilter]);

  // Export Attendance to CSV / Excel File
  const handleExportCsv = () => {
    if (records.length === 0) return;

    const headers = ['Enrollment No', 'Full Name', 'Department', 'Semester', 'Division', 'NFC Tag', 'Subject', 'Date', 'Time', 'Status'];
    const rows = records.map(r => {
      const st = r.student || {};
      const dateStr = new Date(r.scannedAt).toLocaleDateString();
      const timeStr = new Date(r.scannedAt).toLocaleTimeString();
      const subjectStr = r.session?.subject || r.lecture?.subject || 'Lecture';
      return [
        `"${st.enrollmentNumber || ''}"`,
        `"${st.fullName || ''}"`,
        `"${st.department || ''}"`,
        `"${st.semester || ''}"`,
        `"${st.division || ''}"`,
        `"${st.nfcTagNumber || ''}"`,
        `"${subjectStr}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${r.status || 'Present'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NFC_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF Report
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="container student-page-container fade-in">
      
      {/* Header Banner */}
      <div className="glass-card page-header-card">
        <div className="header-left">
          <div className="header-icon-box" style={{ background: '#0284c7' }}>
            <BarChart3 size={32} />
          </div>
          <div>
            <h2>Attendance Analytics & Reports</h2>
            <p className="subtitle">Filter attendance by Date, Subject, Semester, & Division. Export to Excel or PDF</p>
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="primary-btn size-auto" onClick={handleExportCsv} disabled={records.length === 0}>
            <Download size={16} className="mr-6" /> Export Excel (CSV)
          </button>
          <button className="outline-btn" onClick={handlePrintPdf} disabled={records.length === 0}>
            <Printer size={16} className="mr-6" /> Print PDF
          </button>
        </div>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div className="glass-card controls-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Student Name, Enrollment, or NFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filters-group">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="sky-select filter-select">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} className="sky-select filter-select">
            <option value="">All Semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>

          <select value={divFilter} onChange={(e) => setDivFilter(e.target.value)} className="sky-select filter-select">
            <option value="">All Divisions</option>
            {DIVISIONS.map(v => <option key={v} value={v}>Division {v}</option>)}
          </select>

          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="sky-input filter-select"
            style={{ width: '160px' }}
          />

          <button className="refresh-btn" onClick={fetchReports} title="Refresh Data">
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-card table-card">
        {loading ? (
          <div className="loading-spinner">
            <RefreshCw size={28} className="spinner" />
            <p>Loading attendance reports...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="no-files-msg" style={{ padding: '60px 20px' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
            <h4>No Attendance Records Found</h4>
            <p>Try adjusting your search query or filter selections.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sky-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrollment No</th>
                  <th>Department / Sem</th>
                  <th>Subject</th>
                  <th>NFC Tag No</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const st = r.student || {};
                  const subjectName = r.session?.subject || r.lecture?.subject || 'Lecture Session';
                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="student-profile-cell">
                          <img src={st.photoUrl || '/placeholder.png'} alt={st.fullName} className="student-avatar-thumb" />
                          <span className="student-name-text">{st.fullName || 'Student'}</span>
                        </div>
                      </td>
                      <td><span className="enrollment-badge">{st.enrollmentNumber || 'N/A'}</span></td>
                      <td>{st.department} (Sem {st.semester}-{st.division})</td>
                      <td><strong>{subjectName}</strong></td>
                      <td><span className="nfc-tag-badge">{st.nfcTagNumber || 'N/A'}</span></td>
                      <td>{new Date(r.scannedAt).toLocaleString()}</td>
                      <td>
                        <span className="status-badge present">
                          <CheckCircle2 size={13} className="mr-4" /> Present
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

    </div>
  );
};

export default AttendanceReports;
