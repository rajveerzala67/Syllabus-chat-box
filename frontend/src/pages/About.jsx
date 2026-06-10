import React from 'react';

const About = () => {
  return (
    <div className="container about-container fade-in">
      <div className="glass-card informational-card">
        <h2>About Us</h2>
        <div className="info-content">
          <p className="highlight-text">
            We help students track their syllabus and stay organized throughout the academic year!
          </p>
          <p>
            Syllabus Checkbox provides a unified platform where students can check off completed 
            curriculum basics and class coordinators can publish real-time syllabus updates and share files.
          </p>
          <p>
            Our mission is to simplify curriculum management, reduce communications gaps between coordinators and 
            students, and provide useful tips and revision timelines to help you study effectively!
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
