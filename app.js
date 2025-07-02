const { useState } = React;

function Navbar({ setPage }) {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="mailto:haoming_chen@berkeley.edu">email</a>
        <a href="https://github.com/haoming-chen2006">github</a>
        <a href="https://linkedin.com/in/haoming-chen-7421b230b">linkedin</a>
      </div>
      <div className="nav-right">
        <a href="#" onClick={() => setPage('about')}>about</a>
        <a href="#" onClick={() => setPage('research')}>research</a>
        <a href="#" onClick={() => setPage('experiences')}>experiences</a>
        <a href="#" onClick={() => setPage('fun')}>fun</a>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <div className="main-content">
      <div className="hero-section">
        <div className="hero">
          <h1>Haoming Chen</h1>
          <p>Welcome to my website! I am a freshman at UC Berkeley.</p>
        </div>
        <div className="hero-image">
          <img src="hero.jpg" alt="Haoming" />
        </div>
      </div>
      <div className="section bio">
        <h2>Bio</h2>
        <p></p>
      </div>
      <div className="section news">
        <h2>News</h2>
        <p></p>
      </div>
    </div>
  );
}

function Empty({ title }) {
  return (
    <div className="main-content">
      <h2>{title}</h2>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('about');
  let content;
  if (page === 'about') content = <Home />;
  else if (page === 'research') content = <Empty title="Research" />;
  else if (page === 'experiences') content = <Empty title="Experiences" />;
  else if (page === 'fun') content = <Empty title="Fun" />;

  return (
    <div>
      <Navbar setPage={setPage} />
      {content}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
