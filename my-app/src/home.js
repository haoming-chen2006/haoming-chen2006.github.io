import './main.css';
import { useState } from 'react';

const Home = ({ setPage }) => {
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


  return (
    <div className="main-content">
      <div className="hero-section">
        <div className="hero">
          <h1 className="subhead">Haoming Chen</h1>
          <p className="header"> I am a sophomore at UC Berkeley studying Computer Science and Mathematics.</p>
        </div>
        <div className="hero-image">
          <img src="/hero.jpg" alt="Haoming" />
        </div>
      </div>
      <div className="section bio">
        <h2>Bio</h2>
        <p className='main-text'> 
          Academically, I'm interested in  <b><span>computer vision models </span></b>
            and application of <b><span>machine learning in science</span></b>, especially physics.
          I am also passionate about <b><span>creative use of LLM agents</span></b> in gamified settings.
        </p>
        <p className='main-text'> 
          I'm also intested in <b><span>education inequality research</span></b> and <b><span>STEM outreach</span></b>.
        </p>
        <p className='main-text'>
          Checkout my{' '}
          <span
            style={{ fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setPage('research')}
          >
            research projects
          </span>
          {', '}
          <span
            style={{ fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setPage('experiences')}
          >
            experiences
          </span>
          {', and '}
          <span
            style={{ fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => setPage('fun')}
          >
            fun stuff
          </span>
          !
        </p>
      </div>
      <div className="section blog">
        <h2>Blog</h2>
        <div className="blog-content-wrapper">
          <div className="blog-container">
            {newsItems.map((item, index) => (
              <div key={index} className="blog-item">
                <h3 className="blog-title">{item.title}</h3>
                <p className="blog-date">{item.date}</p>
                <p className="blog-content">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;