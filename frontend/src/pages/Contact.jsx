import React from 'react';
import { Mail, Phone, User, ExternalLink } from 'lucide-react';

const Contact = () => {
  return (
    <div className="container contact-container fade-in">
      <div className="glass-card informational-card">
        <h2>Contact Us</h2>
        <div className="contact-grid">
          
          <div className="contact-item-card glass-card inner-card">
            <User className="contact-icon text-cyan" size={24} />
            <div className="contact-info">
              <span className="label">Developer Group</span>
              <span className="value dev-name-highlight">Syllabus Checkbox Group</span>
            </div>
          </div>

          <div className="contact-item-card glass-card inner-card">
            <Mail className="contact-icon text-indigo" size={24} />
            <div className="contact-info">
              <span className="label">Support Email</span>
              <span className="value">support@syllabusCheckbox.com</span>
            </div>
          </div>

          <div className="contact-item-card glass-card inner-card">
            <Mail className="contact-icon text-purple" size={24} />
            <div className="contact-info">
              <span className="label">Ongoing Mail</span>
              <span className="value">sgm81996@gmail.com</span>
            </div>
          </div>

          <div className="contact-item-card glass-card inner-card">
            <Phone className="contact-icon text-green" size={24} />
            <div className="contact-info">
              <span className="label">Contact Phone</span>
              <span className="value">+91 1234567890</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;
