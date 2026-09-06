// Stylised parchment map: terrain sampled from sim/terrain.ts every 2 m over ±MAP_HALF, coloured by height/water,
// hill-shaded, with a hand-drawn ink outline, landmark icons and the player as an arrow.
import { terrainHeight, MAIN_PATH } from '../sim/terrain.ts';
import { LAKE, MAP_HALF, LANDMARKS } from '../content/level.ts';
import { h, ornament } from './dom.ts';
import { icon } from './icons.ts';
import type { UIContext, Screen } from './types.ts';
import { screenTabs, closeButton, type Nav } from './tabs.ts';

const STEP = 2;
const PINS: { key: keyof typeof LANDMARKS; label: string; glyph: string; above?: boolean }[] = [
  { key: 'start', label: 'The shore', glyph: '⚓' }, { key: 'camp', label: 'Camp', glyph: '🔥' }, { key: 'boulder', label: 'Boulder', glyph: '●', above: true },
  { key: 'chapel', label: 'Ruined chapel', glyph: '✝' }, { key: 'gate', label: 'Crypt gate', glyph: '☠', above: true }, { key: 'cache', label: 'Cache', glyph: '✦', above: true },
];

export function createMap(ctx: UIContext, nav: Nav): Screen {
  const canvas = h('canvas') as HTMLCanvasElement; const wrap = h('div.map-wrap', canvas);
  const legend = h('div.map-legend',
    h('span', h('i', { style: { background: '#4d6b8a' } }), 'The Hollowmere'), h('span', h('i', { style: { background: '#b9a77a' } }), 'Shore & lowland'),
    h('span', h('i', { style: { background: '#8f8a6a' } }), 'Hills'), h('span', h('i', { style: { background: '#c48a4a' } }), 'The road'),
    h('span', h('i', { style: { background: '#c0392b', borderRadius: '50%' } }), 'You'));
  const panel = ornament(h('div.panel.blur.big-panel.content', closeButton(nav), screenTabs('map', nav), wrap, legend));
  const el = h('div.screen#map', h('div.veil'), panel);
  let base: HTMLCanvasElement | null = null; let raf = 0;

  function buildBase() {
    const n = Math.floor((MAP_HALF * 2) / STEP) + 1; const S = 4; // 4 px per sample → 600 px map
    const c = document.createElement('canvas'); c.width = n * S; c.height = n * S; const g = c.getContext('2d')!;
    const hs = new Float32Array(n * n); let hmin = Infinity, hmax = -Infinity;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -MAP_HALF + i * STEP, z = -MAP_HALF + j * STEP; const hh = terrainHeight(x, z); hs[j * n + i] = hh; if (hh < hmin) hmin = hh; if (hh > hmax) hmax = hh; }
    const img = g.createImageData(c.width, c.height); const d = img.data;
    const hash = (x: number, y: number) => { let t = Math.imul(x, 374761393) + Math.imul(y, 668265263); t = Math.imul(t ^ (t >>> 13), 1274126177); return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };
    for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
      const i = Math.min(n - 1, px / S), j = Math.min(n - 1, py / S);
      const i0 = Math.floor(i), j0 = Math.floor(j), fx = i - i0, fz = j - j0; const i1 = Math.min(n - 1, i0 + 1), j1 = Math.min(n - 1, j0 + 1);
      const hh = (hs[j0 * n + i0] * (1 - fx) + hs[j0 * n + i1] * fx) * (1 - fz) + (hs[j1 * n + i0] * (1 - fx) + hs[j1 * n + i1] * fx) * fz;
      // slope for hill shading (light from the north-west)
      const hl = hs[j0 * n + Math.max(0, i0 - 1)], hr = hs[j0 * n + i1], hu = hs[Math.max(0, j0 - 1) * n + i0], hd = hs[j1 * n + i0];
      const shade = Math.max(-1, Math.min(1, ((hr - hl) + (hd - hu)) * 0.18));
      let r: number, gg: number, b: number;
      if (hh < LAKE.level) { const depth = Math.min(1, (LAKE.level - hh) / 6); r = 96 - depth * 40; gg = 122 - depth * 40; b = 150 - depth * 40; }
      else {
        const t = Math.min(1, (hh - LAKE.level) / Math.max(1, hmax - LAKE.level));
        // parchment lowland → olive hills → grey-brown peaks
        const stops: [number, number, number, number][] = [[0, 205, 186, 140], [0.08, 190, 178, 128], [0.3, 158, 152, 104], [0.6, 128, 122, 92], [1, 110, 104, 92]];
        let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
        const a = stops[k], bb = stops[k + 1]; const u = Math.min(1, Math.max(0, (t - a[0]) / (bb[0] - a[0] || 1)));
        r = a[1] + (bb[1] - a[1]) * u; gg = a[2] + (bb[2] - a[2]) * u; b = a[3] + (bb[3] - a[3]) * u;
        const sh = 1 - shade * 0.55; r *= sh; gg *= sh; b *= sh;
        // contour ink lines every 3 m
        const cont = Math.abs(((hh - LAKE.level) / 3) % 1); if (cont < 0.06 && t > 0.05) { r *= 0.72; gg *= 0.7; b *= 0.66; }
      }
      // paper grain
      const grain = (hash(px, py) - 0.5) * 14; r += grain; gg += grain; b += grain;
      const o = (py * c.width + px) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // road
    const toPx = (x: number, z: number) => [((x + MAP_HALF) / (MAP_HALF * 2)) * c.width, ((z + MAP_HALF) / (MAP_HALF * 2)) * c.height] as const;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, col] of [[7, 'rgba(70,45,20,.55)'], [3.5, '#c48a4a']] as const) {
      g.strokeStyle = col; g.lineWidth = w; g.setLineDash(w < 5 ? [6, 5] : []); g.beginPath();
      MAIN_PATH.forEach((s, i) => { const [x0, z0] = toPx(s.x0, s.z0), [x1, z1] = toPx(s.x1, s.z1); if (i === 0) g.moveTo(x0, z0); g.lineTo(x1, z1); });
      g.stroke(); g.setLineDash([]);
    }
    // lake outline + waves
    const [lx, lz] = toPx(LAKE.x, LAKE.z); const lr = (LAKE.r / (MAP_HALF * 2)) * c.width;
    g.strokeStyle = 'rgba(30,40,60,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(lx, lz, lr - 4, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(200,215,235,.35)'; g.lineWidth = 1.2;
    for (let k = 0; k < 14; k++) { const ang = k * 1.7 + 0.3, rr = lr * (0.15 + ((k * 37) % 60) / 100); const wx = lx + Math.cos(ang) * rr, wz = lz + Math.sin(ang) * rr; g.beginPath(); g.moveTo(wx - 10, wz); g.quadraticCurveTo(wx - 5, wz - 4, wx, wz); g.quadraticCurveTo(wx + 5, wz + 4, wx + 10, wz); g.stroke(); }
    // vignette + border ink
    const vg = g.createRadialGradient(c.width / 2, c.height / 2, c.width * 0.35, c.width / 2, c.height / 2, c.width * 0.75); vg.addColorStop(0, 'rgba(60,40,15,0)'); vg.addColorStop(1, 'rgba(60,40,15,.55)');
    g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(70,45,20,.8)'; g.lineWidth = 6; g.strokeRect(3, 3, c.width - 6, c.height - 6);
    g.strokeStyle = 'rgba(214,178,94,.6)'; g.lineWidth = 1.5; g.strokeRect(12, 12, c.width - 24, c.height - 24);
    // compass rose
    const cx = c.width - 62, cy = 66; g.save(); g.translate(cx, cy);
    g.strokeStyle = 'rgba(60,40,15,.85)'; g.fillStyle = 'rgba(60,40,15,.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, -30); g.lineTo(5, -6); g.lineTo(-5, -6); g.closePath(); g.fill(); g.rotate(Math.PI / 2); }
    g.font = '700 14px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText('N', 0, -36);
    g.restore();
    // title cartouche
    g.font = '600 22px Cinzel, Georgia, serif'; g.textAlign = 'left'; g.fillStyle = 'rgba(60,40,15,.9)'; g.fillText('THE HOLLOWMERE', 34, 52);
    g.font = 'italic 15px "EB Garamond", Georgia, serif'; g.fillText('and the hills north of the road', 36, 74);
    return c;
  }
  function draw() {
    if (!base) base = buildBase();
    const g = canvas.getContext('2d')!; canvas.width = base.width; canvas.height = base.height;
    g.drawImage(base, 0, 0);
    const toPx = (x: number, z: number) => [((x + MAP_HALF) / (MAP_HALF * 2)) * canvas.width, ((z + MAP_HALF) / (MAP_HALF * 2)) * canvas.height] as const;
    // landmarks
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const pin of PINS) {
      const lm = LANDMARKS[pin.key] as { x: number; z: number }; const [px, pz] = toPx(lm.x, lm.z);
      g.fillStyle = 'rgba(250,240,215,.9)'; g.strokeStyle = 'rgba(60,40,15,.9)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(px, pz, 11, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#3a2a12'; g.font = '13px serif'; g.fillText(pin.glyph, px, pz + 1);
      g.font = '600 11px Cinzel, Georgia, serif'; g.fillStyle = 'rgba(40,26,10,.95)'; g.strokeStyle = 'rgba(230,215,180,.85)'; g.lineWidth = 3;
      const ly = pin.above ? pz - 22 : pz + 24;
      g.strokeText(pin.label.toUpperCase(), px, ly); g.fillText(pin.label.toUpperCase(), px, ly);
    }
    // player arrow
    const p = ctx.world.player;
    if (p && Math.abs(p.pos.z) < MAP_HALF + 5) {
      const [px, pz] = toPx(p.pos.x, p.pos.z); g.save(); g.translate(px, pz); g.rotate(-p.yaw + Math.PI);
      g.fillStyle = '#c0392b'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6;
      g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
    } else if (p) {
      g.font = 'italic 15px "EB Garamond", Georgia, serif'; g.fillStyle = 'rgba(60,40,15,.9)'; g.textAlign = 'center'; g.fillText('You are beneath the hill — the crypt is not on this map.', canvas.width / 2, canvas.height - 34);
    }
    // sepia wash
    g.fillStyle = 'rgba(120,90,40,.08)'; g.fillRect(0, 0, canvas.width, canvas.height);
  }
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  return {
    el,
    open() { el.classList.add('on'); cancelAnimationFrame(raf); loop(); },
    close() { el.classList.remove('on'); cancelAnimationFrame(raf); },
    key(code) { if (code === 'Escape' || code === 'KeyM') { nav.close(); return true; } if (code === 'KeyI') { nav.show('inventory'); return true; } if (code === 'KeyC') { nav.show('character'); return true; } if (code === 'KeyJ') { nav.show('journal'); return true; } return true; },
  };
}
export { icon };
