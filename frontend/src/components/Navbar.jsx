import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, FileText, ClipboardList, Info, Mail, LogOut } from 'lucide-react';

const Navbar = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-nav">
      <div className="nav-brand">
        <BookOpen className="book-logo" size={28} />
        <span className="brand-text">Syllabus Checkbox</span>
      </div>
      <div className="tabs">
        <NavLink to="/" className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <BookOpen className="nav-icon" size={18} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/files" className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <FileText className="nav-icon" size={18} />
          <span>Files</span>
        </NavLink>
        <NavLink to="/updates" className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <ClipboardList className="nav-icon" size={18} />
          <span>Updates</span>
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <Info className="nav-icon" size={18} />
          <span>About</span>
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => isActive ? "tab-link active" : "tab-link"}>
          <Mail className="nav-icon" size={18} />
          <span>Contact</span>
        </NavLink>
        <button onClick={handleSignOut} className="signout-btn">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
      {user && (
        <div className="user-badge">
          <span className="role-tag">{user.role}</span>
          <span className="user-name">@{user.username}</span>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
