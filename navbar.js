const Navbar = ({ setPage }) => (
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
  
  export default Navbar;