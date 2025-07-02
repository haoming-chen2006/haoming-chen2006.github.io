const Home = ({ setPage }) => (
    <div className="main-content">
      <div className="hero-section">
        <div className="hero">
          <h1>Haoming Chen</h1>
          <p>Welcome to my website! I am a sophomore at UC Berkeley studying Computer Science and Mathematics.</p>
        </div>
        <div className="hero-image">
          <img src="hero.jpg" alt="Haoming" />
        </div>
      </div>
      <div className="section bio">
        <h2>Bio</h2>
        <p>
          Academically, I'm interested in  <b><span style={{ color: 'purple' }}>computer vision models </span></b> 
            and application of <b><span style={{ color: 'purple' }}>machine learning in science</span></b>, especially physics.
          I am also passionate about <b><span style={{ color: 'purple' }}>creative use of LLM agemnts</span></b> in gamified settings.
        </p>
        <p>
          I'm also passionate about <b><span style={{ color: 'purple' }}>education inequality research</span></b> and <b><span style={{ color: 'purple' }}>STEM outreach</span></b>.
        </p>
        <p>
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
        <p></p>
      </div>
    </div>
  );
  
  export default Home;