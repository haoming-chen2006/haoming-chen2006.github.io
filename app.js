const { useState } = React;
import Navbar from './navbar.js';
import Home from './home.js';
import Research from './research.js';
import Experiences from './experience.js';
import Fun from './fun.js';

function App() {
  const [page, setPage] = useState('about');
  let content;
  if (page === 'about') content = <Home setPage={setPage} />;
  else if (page === 'research') content = <Research />;
  else if (page === 'experiences') content = <Experiences />;
  else if (page === 'fun') content = <Fun />;

  return (
    <div>
      <Navbar setPage={setPage} />
      {content}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
