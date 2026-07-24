import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  BookOpen, FileText, ClipboardList, Users, Calendar, BarChart3, 
  Award, Info, Mail, LogOut, Menu, X 
} from 'lucide-react';

const Navbar = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isTeacher = user && (user.role === 'teacher' || user.role === 'admin');
  const canViewReport = user && (user.role === 'student' || user.role === 'coordinator');

  const handleSignOut = () => {
    setMobileOpen(false);
    logout();
    navigate('/login');
  };

  const closeMenu = () => {
    setMobileOpen(false);
  };

  return (
    <nav className="glass-nav">
      <div className="nav-brand-bar">
        <div className="nav-brand" onClick={() => { closeMenu(); navigate('/'); }}>
          <BookOpen className="book-logo" size={28} />
          <span className="brand-text">Syllabus Checkbox</span>
        </div>

        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`tabs ${mobileOpen ? 'mobile-active' : ''}`}>
        <NavLink to="/" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <BookOpen className="nav-icon" size={18} />
          <span>Home</span>
        </NavLink>
        
        {/* Teacher Navigation */}
        {isTeacher && (
          <>
            <NavLink to="/students" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
              <Users className="nav-icon" size={18} />
              <span>Students</span>
            </NavLink>
            <NavLink to="/lectures" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
              <Calendar className="nav-icon" size={18} />
              <span>Lectures</span>
            </NavLink>
          </>
        )}

        {/* Student & Class Coordinator Navigation */}
        {canViewReport && (
          <NavLink to="/report" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
            <BarChart3 className="nav-icon" size={18} />
            <span>Report</span>
          </NavLink>
        )}

        <NavLink to="/files" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <FileText className="nav-icon" size={18} />
          <span>Files</span>
        </NavLink>
        <NavLink to="/updates" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <ClipboardList className="nav-icon" size={18} />
          <span>Updates</span>
        </NavLink>
        <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <Info className="nav-icon" size={18} />
          <span>About</span>
        </NavLink>
        <NavLink to="/contact" onClick={closeMenu} className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <Mail className="nav-icon" size={18} />
          <span>Contact</span>
        </NavLink>
        <button onClick={handleSignOut} className="signout-btn">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>

        {user && (
          <div className="user-badge mobile-user-badge">
            <span className="role-tag">{user.role}</span>
            <span className="user-name">@{user.username}</span>
          </div>
        )}
      </div>

      {user && (
        <div className="user-badge desktop-user-badge">
          <span className="role-tag">{user.role}</span>
          <span className="user-name">@{user.username}</span>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
