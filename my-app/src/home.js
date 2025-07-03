import './main.css';
import { useState, useEffect } from 'react';

const Home = ({ setPage }) => {
  const [showAllNews, setShowAllNews] = useState(false);
  const titles = [
    'sophomore',
    'machine learning researcher',
    'soccer fan',
    'developer',
    'tutor',
    'startup enthusiast'
  ];
  const colors = [
    '#ffadad',
    '#ffd6a5',
    '#caffbf',
    '#9bf6ff',
    '#a0c4ff',
    '#bdb2ff'
  ];
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % titles.length);
    }, 2000); // rotate every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const newsItems = [
    {
      date: "June 2025",
      title: "Started Summer Intern at Weleap.ai",
      content: "I will be working at the Berkeley Skydeck Startup WeLeap.ai, mainly focusing on the backend and LLM Integration"
    },
    {
      date: "May 2025",
      title: "Started Summer Research at LBNL",
      content: "Thrilled to continue my fall research intern at Lawrence Berkeley National Laboratory into the summer! I start assembling the language model for particle physics and used some novel approaches in vision models"
    },
    {
      date: "May 2025",
      title: "Position at C88C course staff",
      content: "I have confirmed my participation in the upcoming CS C88C course in the summer as an undergraduate course staff."
    },
    {
      date: "April 2025",
      title: "Finished Second Semester of URAP Research",
      content: "I finished my second semester working at Berkeley's Education and Organization lab."
    },
    {
      date: "March 2025",
      title: "Founded AI Study Group",
      content: "Organized a weekly study group for students interested in AI and machine learning, fostering collaborative learning and peer support."
    }
  ];

  const displayedNews = showAllNews ? newsItems : newsItems.slice(0, 3);

  return (
    <div className="main-content">
      <div className="hero-section">
        <div className="hero">
          <h1 className="subhead">Haoming Chen</h1>
          <p className="header">
            I am a{' '}
            <span
              key={titleIndex}
              className="animated-word"
              style={{ backgroundColor: colors[titleIndex] }}
            >
              {titles[titleIndex]}
            </span>{' '}
            at UC Berkeley studying Computer Science and Mathematics.
          </p>
        </div>
        <div className="hero-image">
          <img src="/hero.jpg" alt="Haoming" />
        </div>
      </div>
      <div className="section bio">
        <h2>Bio</h2>
        <p className='main-text'> 
          Academically, I'm interested in  <b><span style={{ color: 'purple' }}>computer vision models </span></b> 
            and application of <b><span style={{ color: 'purple' }}>machine learning in science</span></b>, especially physics.
          I am also passionate about <b><span style={{ color: 'purple' }}>creative use of LLM agents</span></b> in gamified settings.
        </p>
        <p className='main-text'> 
          I'm also intested in <b><span style={{ color: 'purple' }}>education inequality research</span></b> and <b><span style={{ color: 'purple' }}>STEM outreach</span></b>.
        </p>
        <p className='main-text'>
          Checkout my{' '}
          <span
            style={{ color: 'purple', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setPage('research')}
          >
            research projects
          </span>
          {', '}
          <span
            style={{ color: 'purple', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setPage('experiences')}
          >
            experiences
          </span>
          {', and '}
          <span
            style={{ color: 'purple', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setPage('fun')}
          >
            fun stuff
          </span>
          !
        </p>
      </div>
      <div className="section news">
        <h2>News</h2>
        <div className="news-content-wrapper">
          <div className="timeline-progress">
            {displayedNews.map((item, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-date">{item.date}</div>
                {index < displayedNews.length - 1 && <div className="timeline-line"></div>}
              </div>
            ))}
          </div>
          
          <div className="news-container">
            {displayedNews.map((item, index) => (
              <div key={index} className="news-item">
                <h3 className="news-title">{item.title}</h3>
                <p className="news-content">{item.content}</p>
              </div>
            ))}
            
            {!showAllNews && (
              <button 
                className="expand-news-btn" 
                onClick={() => setShowAllNews(true)}
              >
                Show All News
              </button>
            )}
            {showAllNews && (
              <button 
                className="expand-news-btn" 
                onClick={() => setShowAllNews(false)}
              >
                Hide News
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;