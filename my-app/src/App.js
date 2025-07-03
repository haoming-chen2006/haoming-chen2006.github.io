
import React from 'react';
import Navbar from './navbar';
import Home from './home';
import Research from './resarch';
import Experiences from './experience';
import Fun from './fun';
const { useState } = React;
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


export default App;
