const { useState } = React;

const players = [
  { name: 'Player 1', shape: 'circle' },
  { name: 'Player 2', shape: 'square' },
  { name: 'Player 3', shape: 'triangle' },
  { name: 'Player 4', shape: 'circle' }
];

const rounds = [
  {
    speeches: [
      { p: 0, text: 'My word is something you see outside.' },
      { p: 1, text: 'Mine can be found indoors.' },
      { p: 2, text: 'Mine is brightly colored.' },
      { p: 3, text: 'Mine is usually large.' }
    ],
    votes: [
      { p: 0, vote: 1 },
      { p: 1, vote: 2 },
      { p: 2, vote: 1 },
      { p: 3, vote: 1 }
    ]
  },
  {
    speeches: [
      { p: 0, text: 'I think Player 2 was suspicious.' },
      { p: 2, text: 'Agreed, he stumbled a lot.' },
      { p: 3, text: 'Maybe it is Player 1.' }
    ],
    votes: [
      { p: 0, vote: 2 },
      { p: 2, vote: 0 },
      { p: 3, vote: 0 }
    ]
  }
];

function positionPlayer(index, total) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = 150;
  const x = 170 + radius * Math.cos(angle) - 30;
  const y = 170 + radius * Math.sin(angle) - 30;
  return { left: x + 'px', top: y + 'px' };
}

function App() {
  const [round, setRound] = useState(0);
  const [speechIdx, setSpeechIdx] = useState(0);
  const [showVotes, setShowVotes] = useState(false);

  const current = rounds[round];
  const currentSpeech = current.speeches[speechIdx];

  function next() {
    if (speechIdx + 1 < current.speeches.length) {
      setSpeechIdx(speechIdx + 1);
    } else if (!showVotes) {
      setShowVotes(true);
    } else {
      setShowVotes(false);
      setSpeechIdx(0);
      setRound((round + 1) % rounds.length);
    }
  }

  return React.createElement('div', null,
    React.createElement('div', { id: 'arena' },
      players.map((p, i) => {
        const pos = positionPlayer(i, players.length);
        const active = currentSpeech && currentSpeech.p === i;
        return React.createElement('div', { key: i, className: 'player ' + p.shape + (active ? ' active' : ''), style: pos },
          active && React.createElement('div', { className: 'bubble' }, currentSpeech.text),
          p.name
        );
      })
    ),
    React.createElement('button', { onClick: next, style: { marginTop: '20px' } }, 'Next'),
    showVotes && React.createElement('div', { id: 'votes' },
      current.votes.map((v, i) => React.createElement('div', { key: i, className: 'vote' }, `${players[v.p].name} votes ${players[v.vote].name}`))
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
