import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Check } from 'lucide-react';

const TOPICS = [
  {
    id: 'grammar',
    label: 'Grammar Tenses Basics',
    info: (
      <div className="topic-info-card">
        <h3>Grammar Tenses Basics</h3>
        <p>• Learn about all 12 tenses in English: Present (Simple, Continuous, Perfect, Perfect Continuous), Past and Future forms.</p>
        <p>• Examples and usage for each tense to understand how they affect sentence structure.</p>
        <p>• Real-life applications: how tenses are used in writing, conversation, and exams.</p>
        <p>• Common mistakes to avoid and tips for mastering tense usage easily.</p>
      </div>
    )
  },
  {
    id: 'history',
    label: 'Important History Dates According to classes',
    info: (
      <div className="topic-info-card">
        <h3>Important History Dates According to Classes</h3>
        <p>• Class 6: Harappan Civilization (c. 2500 BCE), Vedic Age (1500 BCE).</p>
        <p>• Class 7: Mughal Empire (1526 CE), Bhakti Movement (8th - 17th Century).</p>
        <p>• Class 8: Revolt of 1857, Formation of INC (1885), Indian Independence (1947).</p>
        <p>• Simple timeline charts to help remember key years and events.</p>
        <p>• Useful for quick revision and social studies exams.</p>
      </div>
    )
  },
  {
    id: 'science',
    label: 'Science Chapters',
    info: (
      <div className="topic-info-card">
        <h3>Science Chapters</h3>
        <p>• Physics: Motion, Force, Energy, Light & Sound explained with simple experiments.</p>
        <p>• Chemistry: Elements, Compounds, Chemical Reactions, Acids & Bases with real-life examples.</p>
        <p>• Biology: Human body systems, Plants & Animals, Cells, Nutrition.</p>
        <p>• Class-wise summary available for better understanding (Class 6–10).</p>
        <p>• Helps in school homework, tests, and Olympiad practice.</p>
      </div>
    )
  },
  {
    id: 'math',
    label: 'Math Practice',
    info: (
      <div className="topic-info-card">
        <h3>Math Practice</h3>
        <p>• Arithmetic: Fractions, Decimals, Percentage, Profit & Loss.</p>
        <p>• Algebra: Simple equations, Expressions, Linear Equations in One Variable.</p>
        <p>• Geometry: Angles, Triangles, Perimeter & Area of figures.</p>
        <p>• Data Handling: Bar Graphs, Pie Charts, Probability basics.</p>
        <p>• Chapter-wise questions with tricks to solve quickly.</p>
      </div>
    )
  },
  {
    id: 'computer',
    label: 'Computer Basics',
    info: (
      <div className="topic-info-card">
        <h3>Computer Basics</h3>
        <p>• Introduction to computers: Types, Parts (CPU, Monitor, Keyboard, Mouse).</p>
        <p>• Operating systems: Windows, macOS basics.</p>
        <p>• Software vs Hardware, Storage Devices (Hard disk, Pen Drive).</p>
        <p>• Internet basics: Email, Safe browsing habits, Google search tips.</p>
        <p>• MS Word, Paint, Notepad basics – typing, saving, and printing documents.</p>
      </div>
    )
  }
];

const Home = () => {
  const { user, updateProgress } = useContext(AuthContext);
  const navigate = useNavigate();

  const [checkedTopics, setCheckedTopics] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  // Sync checked list from loaded user data
  useEffect(() => {
    if (user && user.completedTopics) {
      setCheckedTopics(user.completedTopics);
    }
  }, [user]);

  const handleToggle = async (topicId) => {
    let updated;
    if (checkedTopics.includes(topicId)) {
      updated = checkedTopics.filter(id => id !== topicId);
    } else {
      updated = [...checkedTopics, topicId];
    }
    setCheckedTopics(updated);
    // Sync to backend DB
    await updateProgress(updated);
  };

  const handleProceed = () => {
    setShowDetails(true);
    // Scroll to details container
    setTimeout(() => {
      document.getElementById('details-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="container home-container fade-in">
      <div className="glass-card main-content-card">
        <h1>📚 Basics of Subjects</h1>
        <p className="description-text">Tick the subjects you've completed. Your progress will be saved automatically.</p>
        
        <div className="topic-list">
          {TOPICS.map((topic) => {
            const isChecked = checkedTopics.includes(topic.id);
            return (
              <label 
                key={topic.id} 
                className={`topic-checkbox-label ${isChecked ? 'ticked' : ''}`}
              >
                <div className="checkbox-control">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(topic.id)}
                  />
                  <div className="custom-checkbox">
                    {isChecked && <Check size={14} className="check-icon" />}
                  </div>
                </div>
                <span className="topic-text">{topic.label}</span>
              </label>
            );
          })}
        </div>

        <div className="action-buttons">
          <button onClick={handleProceed} className="primary-btn size-auto">
            Proceed to Details
          </button>
          <button onClick={() => navigate('/updates')} className="secondary-btn size-auto">
            Check Syllabus Updates
          </button>
        </div>
      </div>

      {showDetails && (
        <div id="details-section" className="details-section glass-card fade-in">
          <h2>📖 Detailed Information</h2>
          <div className="details-grid">
            {checkedTopics.length === 0 ? (
              <p className="no-selection-msg">No topics checked. Tick some boxes above to view their details here!</p>
            ) : (
              TOPICS.map((topic) => {
                if (checkedTopics.includes(topic.id)) {
                  return <div key={topic.id} className="details-card-item">{topic.info}</div>;
                }
                return null;
              })
            )}
          </div>
          <button onClick={() => setShowDetails(false)} className="outline-btn mt-20">
            ← Back to Home
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
