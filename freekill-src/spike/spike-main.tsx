// Agent 0's browser measuring page. Separate entry so it never collides with
// src/main.tsx, which Agent 4 owns.
//   /freekill/spike/spike.html                     interactive
//   /freekill/spike/spike.html?autorun             blocks load until done
//   /freekill/spike/spike.html?autorun&pinorder    with makeGeneralPile pinned
//   /freekill/spike/spike.html?autorun&loadonly    boot only, no game
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpikePage } from './SpikePage';
import { runSpikeInTab } from './headless';

const q = new URLSearchParams(location.search);
if (q.has('autorun')) {
  const rows = await runSpikeInTab(q.has('pinorder'), q.has('loadonly'));
  document.title = 'SPIKE_DONE';
  document.getElementById('root')!.innerHTML =
    `<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
} else {
  createRoot(document.getElementById('root')!).render(<StrictMode><SpikePage /></StrictMode>);
}
