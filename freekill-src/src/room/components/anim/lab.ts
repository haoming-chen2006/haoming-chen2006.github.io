/**
 * The glyph sheet: every drawn object, at seat size, on a portrait-ish ground.
 *
 * Dev only, and deliberately static — a glyph has to work as a SILHOUETTE, and
 * a moving one flatters itself. Judging the drawings still is how they got
 * legible. `shots.mjs --sheet` captures this page.
 */
import { GLYPHS } from './glyphs';
import { glyph } from './parts';
import type { Scene } from './parts';
import './effects.css';

const PALETTES = ['steel', 'gold', 'jade', 'fire', 'ash', 'ice', 'blood', 'indigo', 'amber', 'thunder'];

const sheet = document.querySelector<HTMLElement>('#sheet')!;
let scene: Scene = { u: 118, span: 0, angle: 0, index: 0, count: 1 };

const params = new URLSearchParams(location.search);
const paletteFor = params.get('palette');
const only = params.get('only');
const bigness = Number(params.get('size') ?? 1);
if (bigness > 1) {
  document.documentElement.style.setProperty('--cell', `${Math.round(190 * bigness)}px`);
  const st = document.createElement('style');
  st.textContent = `.cell{width:${Math.round(190 * bigness)}px;height:${Math.round(214 * bigness)}px}`;
  document.head.appendChild(st);
}

let i = 0;
for (const [name, g] of Object.entries(GLYPHS)) {
  if (only && !name.toLowerCase().includes(only.toLowerCase())) continue;
  const cell = document.createElement('div');
  cell.className = 'cell';

  const root = document.createElement('div');
  const palette = paletteFor ?? PALETTES[i % PALETTES.length];
  root.className = `fx fx-p--${palette}`;
  root.style.setProperty('--fx-ms', '600ms');
  root.style.setProperty('--fx-u', `${scene.u}px`);
  cell.appendChild(root);

  // No motion class: the still is the test.
  glyph(root, { ...scene, u: scene.u * bigness }, g, { size: 1.5 });

  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.innerHTML = `${name} <span class="sub">${g.box[0]}x${g.box[1]} · ${g.ink.length}+${g.lit?.length ?? 0} strokes</span>`;
  cell.appendChild(cap);
  sheet.appendChild(cell);
  i += 1;
}

(window as unknown as Record<string, unknown>).lab = { count: i };
