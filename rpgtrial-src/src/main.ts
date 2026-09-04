import { Game } from './game.ts';
import { assets } from './render/assets.ts';

const bar = document.getElementById('loadingBar')!; const text = document.getElementById('loadingText')!;
assets.onProgress = (l, t, label) => { bar.style.width = `${Math.round((l / Math.max(t, 1)) * 100)}%`; if (text) text.textContent = label.split('/').pop() ?? ''; };
(async () => {
  const game = new Game(document.getElementById('gl') as HTMLCanvasElement);
  await game.init((label) => { if (text) text.textContent = label; });
  document.getElementById('loading')!.classList.add('hide');
  game.start();
})().catch((e) => { console.error(e); if (text) text.textContent = 'Failed to load: ' + e.message; });
