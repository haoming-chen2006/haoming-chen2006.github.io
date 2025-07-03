import './navbar.css';

const Navbar = ({ setPage }) => {
  return (
    <nav className="navbar">
      <div className="nav-section">
        <a 
          href="mailto:haoming_chen@berkeley.edu" 
          className="link-styles icon-link"
        >
          <img src="/email_light.jpeg" alt="Email" className="nav-icon" />
        </a>
        <a 
          href="https://github.com/haoming-chen2006" 
          className="link-styles icon-link"
        >
          <img src="/github.svg" alt="GitHub" className="nav-icon" />
        </a>
        <a 
          href="https://linkedin.com/in/haoming-chen-7421b230b" 
          className="link-styles icon-link"
        >
          <img src="/linkedin.png" alt="LinkedIn" className="nav-icon" />
        </a>
      </div>
      <div className="nav-section">
        <button 
          className="link-styles"
          onClick={() => setPage('about')}
        >
          about
        </button>
        <button 
          className="link-styles"
          onClick={() => setPage('research')}
        >
          research
        </button>
        <button 
          className="link-styles"
          onClick={() => setPage('experiences')}
        >
          experiences
        </button>
        <button 
          className="link-styles-small"
          onClick={() => setPage('fun')}
        >
          fun
        </button>
      </div>
    </nav>
  );
};

export default Navbar;