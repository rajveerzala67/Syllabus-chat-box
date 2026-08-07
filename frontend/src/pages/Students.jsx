import React, { useState, useEffect, useContext } from 'react';
import { api, AuthContext } from '../context/AuthContext';
import {
  Users, UserPlus, Search, Filter, RefreshCw, Eye, Edit3, Trash2,
  X, UploadCloud, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Smartphone, Mail, Phone, Calendar, MapPin
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

const Students = () => {
  const { user } = useContext(AuthContext);

  // Data states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [divFilter, setDivFilter] = useState('');

  // Modals & Active Action states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedStudent, setSelectedStudent] = useState(null);

  // View Detail Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);

  // Delete Confirmation Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    enrollmentNumber: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    department: 'Computer Engineering',
    semester: '5',
    division: 'A',
    academicYear: '2025-2026',
    gender: 'Male',
    dateOfBirth: '2003-01-01',
    address: '',
    nfcTagNumber: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Notifications & Form Feedback
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formError, setFormError] = useState('');

  // Fetch Students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (deptFilter) params.department = deptFilter;
      if (semFilter) params.semester = semFilter;
      if (divFilter) params.division = divFilter;

      const res = await api.get('/students', { params });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      showToast('error', err.response?.data?.message || 'Failed to fetch student records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, deptFilter, semFilter, divFilter]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image file size exceeds 5MB limit.');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('error', 'Only JPG, JPEG, PNG, or WEBP images are allowed.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedStudent(null);
    setFormSuccess(null);
    setFormError('');
    setFormData({
      enrollmentNumber: '',
      fullName: '',
      email: '',
      mobileNumber: '',
      department: 'Computer Engineering',
      semester: '5',
      division: 'A',
      academicYear: '2025-2026',
      gender: 'Male',
      dateOfBirth: '2003-01-01',
      address: '',
      nfcTagNumber: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (student) => {
    setModalMode('edit');
    setSelectedStudent(student);
    setFormSuccess(null);
    setFormError('');
    setFormData({
      enrollmentNumber: student.enrollmentNumber || '',
      fullName: student.fullName || '',
      email: student.email || '',
      mobileNumber: student.mobileNumber || '',
      department: student.department || 'Computer Engineering',
      semester: student.semester ? student.semester.toString() : '5',
      division: student.division || 'A',
      academicYear: student.academicYear || '2025-2026',
      gender: student.gender || 'Male',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '2003-01-01',
      address: student.address || '',
      nfcTagNumber: student.nfcTagNumber || ''
    });
    setPhotoFile(null);
    setPhotoPreview(student.photoUrl || null);
    setShowModal(true);
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalMode === 'add' && !photoFile) {
      setFormError('Please select a passport size photo.');
      showToast('error', 'Please select a passport size photo.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess(null);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });

    if (photoFile) {
      data.append('photo', photoFile);
    }

    try {
      if (modalMode === 'add') {
        const res = await api.post('/students', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFormSuccess({
          message: res.data.message || 'Student profile & user account created successfully!',
          credentials: res.data.credentials,
          student: res.data.student
        });
        showToast('success', 'Student added successfully!');
        fetchStudents();
      } else {
        const res = await api.put(`/students/${selectedStudent._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('success', res.data.message || 'Student updated successfully!');
        setShowModal(false);
        fetchStudents();
      }
    } catch (err) {
      console.error('Submit error:', err);
      const errText = err.response?.data?.message || 'Operation failed. Please try again.';
      setFormError(errText);
      showToast('error', errText);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const res = await api.delete(`/students/${studentToDelete._id}`);
      showToast('success', res.data.message || 'Student deleted successfully!');
      setShowDeleteModal(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('error', err.response?.data?.message || 'Failed to delete student record');
    }
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
      <div className="glass-card page-header-card mb-20">
        <div className="header-left">
          <div className="header-icon-box">
            <Users size={32} />
          </div>
          <div>
            <h2>Student Management</h2>
            <p className="subtitle">Register students, manage NFC tags, & prepare AI verification profiles</p>
          </div>
        </div>
        <div className="header-right">
          <button className="primary-btn size-auto" onClick={handleOpenAddModal}>
            <UserPlus size={18} className="mr-6" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div className="glass-card controls-card mb-20">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Enrollment No, Name, or NFC Tag..."
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
          {/* Dept Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Sem Filter */}
          <select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>

          {/* Div Filter */}
          <select
            value={divFilter}
            onChange={(e) => setDivFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Divisions</option>
            {DIVISIONS.map(v => <option key={v} value={v}>Div {v}</option>)}
          </select>

          <button
            className="refresh-btn"
            onClick={() => { setRefreshing(true); fetchStudents(); }}
            title="Refresh student list"
          >
            <RefreshCw size={16} className={refreshing ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="glass-card table-card">
        {loading ? (
          <div className="loading-spinner">
            <RefreshCw size={28} className="spinner" />
            <p>Loading student records...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="no-files-msg">
            <Users size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No student records found matching your query.</p>
            <button className="outline-btn mt-10" onClick={handleOpenAddModal}>
              Register New Student
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Enrollment No</th>
                  <th>Full Name</th>
                  <th>Dept & Sem</th>
                  <th>Div</th>
                  <th>Contact Info</th>
                  <th>NFC Tag No</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <img
                        src={student.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80'}
                        alt={student.fullName}
                        className="student-avatar-thumb"
                        onClick={() => { setViewStudent(student); setShowViewModal(true); }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
                        }}
                      />
                    </td>
                    <td>
                      <span className="enrollment-tag">{student.enrollmentNumber}</span>
                    </td>
                    <td>
                      <div className="student-name-box">
                        <span className="student-name">{student.fullName}</span>
                        <span className="student-gender-badge">{student.gender}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dept-box">
                        <span className="dept-text">{student.department}</span>
                        <span className="sem-badge">Sem {student.semester}</span>
                      </div>
                    </td>
                    <td>
                      <span className="div-badge">Div {student.division}</span>
                    </td>
                    <td>
                      <div className="contact-box">
                        <span className="contact-email"><Mail size={12} /> {student.email}</span>
                        <span className="contact-phone"><Phone size={12} /> {student.mobileNumber}</span>
                      </div>
                    </td>
                    <td>
                      <span className="nfc-tag-badge">
                        <Smartphone size={13} /> {student.nfcTagNumber}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="action-icon-btn view-btn"
                          onClick={() => { setViewStudent(student); setShowViewModal(true); }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-icon-btn edit-btn"
                          onClick={() => handleOpenEditModal(student)}
                          title="Edit Student"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="action-icon-btn delete-btn"
                          onClick={() => { setStudentToDelete(student); setShowDeleteModal(true); }}
                          title="Delete Student"
                        >
                          <Trash2 size={16} />
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

      {/* ADD / EDIT STUDENT MODAL */}
      {showModal && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal modal-large fade-in">
            <button className="modal-close-btn" onClick={() => setShowModal(false)} title="Close Modal">
              <X size={20} />
            </button>

            <div className="modal-step-header">
              <div className="modal-icon-badge">
                <UserPlus size={26} />
              </div>
              <h3>{modalMode === 'add' ? 'Register New Student' : 'Edit Student Record'}</h3>
              <p>Fill out all student details & upload Cloudinary passport photo</p>
            </div>

            {formSuccess ? (
              <div className="form-success-container fade-in" style={{ padding: '24px 20px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '2px solid #10b981',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <CheckCircle2 size={32} />
                </div>

                <h3 style={{ fontSize: '22px', color: '#34d399', fontWeight: 800, marginBottom: '6px' }}>
                  Student Added Successfully!
                </h3>
                <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '20px' }}>
                  {formSuccess.message}
                </p>

                {formSuccess.credentials && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    textAlign: 'left',
                    maxWidth: '460px',
                    margin: '0 auto 24px auto',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}>
                    <span style={{ fontSize: '12px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                      🔑 Student Login Credentials
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Username / Email:</span>
                      <strong style={{ color: '#ffffff' }}>{formSuccess.credentials.email}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Temp Password:</span>
                      <strong style={{ color: '#34d399', fontFamily: 'monospace', fontSize: '15px' }}>{formSuccess.credentials.tempPassword}</strong>
                    </div>

                    <button
                      type="button"
                      className="outline-btn"
                      style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        const textToCopy = `Student Login Credentials:\nUsername/Email: ${formSuccess.credentials.email}\nTemporary Password: ${formSuccess.credentials.tempPassword}`;
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(textToCopy).catch(() => {});
                        } else {
                          const textArea = document.createElement('textarea');
                          textArea.value = textToCopy;
                          document.body.appendChild(textArea);
                          textArea.select();
                          try { document.execCommand('copy'); } catch (err) {}
                          document.body.removeChild(textArea);
                        }
                        showToast('success', 'Credentials copied to clipboard!');
                      }}
                    >
                      📋 Copy Credentials for Student
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                  <button className="outline-btn" onClick={handleOpenAddModal}>
                    + Add Another Student
                  </button>
                  <button className="sky-primary-btn size-auto" onClick={() => setShowModal(false)}>
                    Done & Close Form
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="student-modal-form-container">
                {formError && (
                  <div className="error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="student-form-grid">

                  {/* Enrollment & NFC Tag */}
                  <div className="sky-input-group">
                    <label>Enrollment Number (Unique) *</label>
                    <input
                      type="text"
                      name="enrollmentNumber"
                      className="sky-input"
                      placeholder="e.g. 210010116001"
                      value={formData.enrollmentNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="sky-input-group">
                    <label>NFC Tag Number (Unique) *</label>
                    <input
                      type="text"
                      name="nfcTagNumber"
                      className="sky-input"
                      placeholder="e.g. NFC-8849-2025"
                      value={formData.nfcTagNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Full Name & Email */}
                  <div className="sky-input-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      className="sky-input"
                      placeholder="e.g. Rajveersinh Zala"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="sky-input-group">
                    <label>Email Address (Unique) *</label>
                    <input
                      type="email"
                      name="email"
                      className="sky-input"
                      placeholder="e.g. rajveer@gmail.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Mobile Number & Academic Year */}
                  <div className="sky-input-group">
                    <label>Mobile Number *</label>
                    <input
                      type="text"
                      name="mobileNumber"
                      className="sky-input"
                      placeholder="e.g. 9876543210"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="sky-input-group">
                    <label>Academic Year *</label>
                    <input
                      type="text"
                      name="academicYear"
                      className="sky-input"
                      placeholder="e.g. 2025-2026"
                      value={formData.academicYear}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Department & Semester */}
                  <div className="sky-input-group">
                    <label>Department *</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="sky-select"
                      required
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
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

                  {/* Division */}
                  <div className="sky-input-group full-width">
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

                  {/* Gender & Date of Birth */}
                  <div className="sky-input-group">
                    <label>Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="sky-select"
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sky-input-group">
                    <label>Date of Birth *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      className="sky-input"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Address */}
                  <div className="sky-input-group full-width">
                    <label>Address *</label>
                    <input
                      type="text"
                      name="address"
                      className="sky-input"
                      placeholder="Enter full address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Photo Upload Input & Preview */}
                  <div className="sky-input-group full-width">
                    <label>Passport Size Photo (Cloudinary Upload, Max 5MB) *</label>
                    <div className="photo-upload-box">
                      <div className="upload-input-area">
                        <UploadCloud size={24} className="upload-icon" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={handleFileChange}
                        />
                        <span>Click or drag image file here</span>
                        <small>Allowed formats: JPG, PNG, WEBP (Max 5MB)</small>
                      </div>
                      {photoPreview && (
                        <div className="photo-preview-box">
                          <img src={photoPreview} alt="Passport Preview" />
                          <span className="preview-tag">Photo Selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div> {/* End student-form-grid */}

                <div className="form-submit-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="sky-primary-btn size-auto"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="spinner mr-6" />
                        {modalMode === 'add' ? 'Uploading & Saving...' : 'Updating...'}
                      </>
                    ) : (
                      modalMode === 'add' ? 'Save Student' : 'Update Record'
                    )}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW STUDENT DETAILS MODAL */}
      {showViewModal && viewStudent && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal fade-in">
            <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
              <X size={18} />
            </button>

            <div className="student-profile-card">
              <div className="profile-photo-container">
                <img 
                  src={viewStudent.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80'} 
                  alt={viewStudent.fullName} 
                  className="profile-photo" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
                  }}
                />
                <span className="profile-role-badge">{viewStudent.department}</span>
              </div>

              <h2>{viewStudent.fullName}</h2>
              <p className="profile-enrollment">Enrollment: {viewStudent.enrollmentNumber}</p>

              <div className="profile-details-grid">
                <div className="profile-item">
                  <Smartphone size={16} className="item-icon" />
                  <div>
                    <small>NFC Tag Number</small>
                    <p>{viewStudent.nfcTagNumber}</p>
                  </div>
                </div>

                <div className="profile-item">
                  <Mail size={16} className="item-icon" />
                  <div>
                    <small>Email</small>
                    <p>{viewStudent.email}</p>
                  </div>
                </div>

                <div className="profile-item">
                  <Phone size={16} className="item-icon" />
                  <div>
                    <small>Mobile Number</small>
                    <p>{viewStudent.mobileNumber}</p>
                  </div>
                </div>

                <div className="profile-item">
                  <Calendar size={16} className="item-icon" />
                  <div>
                    <small>Sem & Division</small>
                    <p>Sem {viewStudent.semester} (Div {viewStudent.division})</p>
                  </div>
                </div>

                <div className="profile-item">
                  <MapPin size={16} className="item-icon" />
                  <div>
                    <small>Address</small>
                    <p>{viewStudent.address}</p>
                  </div>
                </div>
              </div>

              <button className="sky-primary-btn mt-20" onClick={() => setShowViewModal(false)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && studentToDelete && (
        <div className="sky-modal-backdrop">
          <div className="sky-otp-modal fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-icon-badge" style={{ background: '#ffe4e6', color: '#e11d48' }}>
              <ShieldAlert size={32} />
            </div>
            <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Confirm Deletion</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Are you sure you want to delete student <strong>{studentToDelete.fullName}</strong> ({studentToDelete.enrollmentNumber})? This will also delete their photo from Cloudinary.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="outline-btn"
                style={{ flex: 1 }}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="sky-primary-btn"
                style={{ flex: 1, background: '#e11d48', marginTop: 0 }}
                onClick={handleDeleteStudent}
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Students;
