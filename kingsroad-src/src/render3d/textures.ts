import * as THREE from 'three';

/** Procedural canvas textures so the game ships with zero image assets. */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  return [c, ctx];
}

const hash = (x: number, y: number, s = 0): number => {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

function noise(x: number, y: number, s = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, s = 0, oct = 4): number {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { sum += noise(x * f, y * f, s + i) * amp; amp *= 0.5; f *= 2; }
  return sum;
}

function finish(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Soft meadow grass with clover patches and blade strokes. */
export function grassTexture(size = 512, base: [number, number, number] = [92, 158, 74], dark = false): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 90, y / 90, 1, 4);
      const n2 = fbm(x / 14, y / 14, 7, 3);
      const patch = Math.pow(Math.max(0, fbm(x / 160, y / 160, 21, 2) - 0.45) * 2.5, 2);
      let l = 0.8 + (n - 0.5) * 0.3 + (n2 - 0.5) * 0.16 + patch * 0.1;
      if (dark) l *= 0.68;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, (base[0] - patch * 20) * l);
      img.data[i + 1] = Math.min(255, (base[1] + patch * 8) * l);
      img.data[i + 2] = Math.min(255, (base[2] - patch * 10) * l);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < size * 8; i++) {
    const x = hash(i, 1) * size, y = hash(i, 2) * size;
    const l = 0.55 + hash(i, 3) * 0.6;
    ctx.strokeStyle = `rgba(${base[0] * l * 1.05 | 0},${base[1] * l * 1.12 | 0},${base[2] * l | 0},0.5)`;
    ctx.lineWidth = 1 + hash(i, 6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (hash(i, 4) - 0.5) * 4, y - 3 - hash(i, 5) * 5); ctx.stroke();
  }
  // tiny clover / flower speckles
  for (let i = 0; i < size / 3; i++) {
    const x = hash(i, 31) * size, y = hash(i, 32) * size;
    ctx.fillStyle = hash(i, 33) > 0.7 ? 'rgba(255,240,200,0.5)' : 'rgba(120,200,110,0.5)';
    ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i, 34), 0, Math.PI * 2); ctx.fill();
  }
  return finish(c);
}


/** Warm sandstone slabs with carved grout lines and cloud-pattern engravings — 王者峡谷 lane paving. */
export function slabTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = '#6e6250';
  ctx.fillRect(0, 0, size, size);
  const rows = 4, cols = 3;
  const ch = size / rows, cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? cw / 2 : 0;
    for (let k = -1; k <= cols; k++) {
      const x = k * cw + off + 3, y = r * ch + 3, w = cw - 6, h = ch - 6;
      const l = 0.9 + (hash(k, r, 1) - 0.5) * 0.25;
      ctx.fillStyle = `rgb(${196 * l | 0},${178 * l | 0},${142 * l | 0})`;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, y + h - 4, w, 4);
      // light grain + an occasional engraved cloud scroll
      for (let g = 0; g < 10; g++) { ctx.strokeStyle = `rgba(0,0,0,${0.04 + hash(k, r, 10 + g) * 0.05})`; ctx.beginPath(); const gx = x + hash(k, r, 20 + g) * w, gy = y + hash(k, r, 30 + g) * h; ctx.moveTo(gx, gy); ctx.lineTo(gx + (hash(k, r, 40 + g) - 0.5) * 18, gy + (hash(k, r, 50 + g) - 0.5) * 6); ctx.stroke(); }
      if (hash(k, r, 7) > 0.72) { ctx.strokeStyle = 'rgba(70,50,30,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let a = 0; a < Math.PI * 3; a += 0.2) { const rr = 3 + a * 1.6; ctx.lineTo(x + w / 2 + Math.cos(a) * rr, y + h / 2 + Math.sin(a) * rr * 0.6); } ctx.stroke(); ctx.lineWidth = 1; }
    }
  }
  return finish(c);
}

/** Layered sedimentary cliff rock, warm grey with ochre bands — the jungle walls of the canyon. */
export function cliffTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const band = Math.sin(y / 11 + fbm(x / 40, y / 40, 3, 3) * 4) * 0.5 + 0.5;
    const n = fbm(x / 30, y / 30, 5, 4);
    const l = 0.72 + band * 0.22 + (n - 0.5) * 0.25;
    const i = (y * size + x) * 4;
    img.data[i] = Math.min(255, 196 * l + band * 16); img.data[i + 1] = Math.min(255, 182 * l + band * 8); img.data[i + 2] = Math.min(255, 158 * l); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 90; i++) { ctx.strokeStyle = `rgba(40,30,20,${0.15 + hash(i, 3) * 0.2})`; ctx.lineWidth = 1 + hash(i, 4) * 1.5; ctx.beginPath(); const x = hash(i, 1) * size, y = hash(i, 2) * size; ctx.moveTo(x, y); ctx.lineTo(x + (hash(i, 5) - 0.5) * 60, y + (hash(i, 6) - 0.3) * 14); ctx.stroke(); }
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(90,140,70,${0.25 + hash(i, 8) * 0.3})`; ctx.beginPath(); ctx.ellipse(hash(i, 9) * size, hash(i, 10) * size * 0.4, 6 + hash(i, 11) * 12, 3 + hash(i, 12) * 4, 0, 0, Math.PI * 2); ctx.fill(); }
  return finish(c);
}

/** Alpha-cut tuft of grass blades for crossed-plane clumps. */
export function grassBladeTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 26; i++) {
    const x0 = size * (0.12 + hash(i, 1) * 0.76), h = size * (0.45 + hash(i, 2) * 0.5), lean = (hash(i, 3) - 0.5) * size * 0.35;
    const l = 0.75 + hash(i, 4) * 0.5;
    const grad = ctx.createLinearGradient(0, size, 0, size - h);
    grad.addColorStop(0, `rgb(${70 * l | 0},${120 * l | 0},${50 * l | 0})`); grad.addColorStop(1, `rgb(${150 * l | 0},${210 * l | 0},${95 * l | 0})`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x0 - 6, size); ctx.quadraticCurveTo(x0 + lean * 0.5, size - h * 0.6, x0 + lean, size - h); ctx.quadraticCurveTo(x0 + lean * 0.5 + 3, size - h * 0.6, x0 + 6, size); ctx.closePath(); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
  return t;
}

/** Stone bricks with mortar, chips and moss for towers and walls. */
export function stoneTexture(size = 256, tint: [number, number, number] = [150, 152, 158]): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = `rgb(${tint[0] * 0.42 | 0},${tint[1] * 0.42 | 0},${tint[2] * 0.42 | 0})`;
  ctx.fillRect(0, 0, size, size);
  const rows = 8, cols = 4;
  const bh = size / rows, bw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2;
    for (let col = -1; col <= cols; col++) {
      const x = col * bw + off, y = r * bh;
      const n = fbm(col * 3.1 + r * 7.7, r * 1.3, 3, 2);
      const l = 0.82 + (n - 0.5) * 0.5;
      const g = 3;
      ctx.fillStyle = `rgb(${tint[0] * l | 0},${tint[1] * l | 0},${tint[2] * l | 0})`;
      ctx.beginPath(); ctx.roundRect(x + g, y + g, bw - g * 2, bh - g * 2, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + g, y + g, bw - g * 2, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + g, y + bh - g - 2, bw - g * 2, 2);
      // per-brick noise
      for (let k = 0; k < 14; k++) {
        const px = x + g + hash(col, r, k) * (bw - g * 2), py = y + g + hash(col, r, k + 50) * (bh - g * 2);
        ctx.fillStyle = hash(col, r, k + 99) > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(px, py, 2 + hash(col, r, k + 7) * 3, 1.5);
      }
      if (hash(col, r, 5) > 0.85) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + g + 4, y + g + 4); ctx.lineTo(x + bw / 2, y + bh - g - 3); ctx.stroke(); }
      if (hash(col, r, 6) > 0.8) { ctx.fillStyle = 'rgba(90,140,70,0.28)'; ctx.beginPath(); ctx.ellipse(x + bw * 0.5, y + bh - g - 2, bw * 0.3, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  return finish(c);
}

/** Rounded cobblestones for the lanes and plinths. */
export function cobbleTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = '#5a5248';
  ctx.fillRect(0, 0, size, size);
  const n = 10;
  const cell = size / n;
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const jx = (hash(col, r, 1) - 0.5) * cell * 0.3, jy = (hash(col, r, 2) - 0.5) * cell * 0.3;
    const x = col * cell + cell / 2 + jx, y = r * cell + cell / 2 + jy;
    const rad = cell * (0.36 + hash(col, r, 3) * 0.1);
    const l = 0.75 + hash(col, r, 4) * 0.4;
    const warm = hash(col, r, 5);
    ctx.fillStyle = `rgb(${(130 + warm * 30) * l | 0},${(120 + warm * 18) * l | 0},${(108 + warm * 8) * l | 0})`;
    ctx.beginPath(); ctx.ellipse(x, y, rad * 1.1, rad, hash(col, r, 6) * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.ellipse(x - rad * 0.2, y - rad * 0.3, rad * 0.55, rad * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x + rad * 0.1, y + rad * 0.45, rad * 0.8, rad * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // wrap seams: repeat edge stones
  return finish(c);
}

export function woodTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const planks = 6;
  const pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const l = 0.85 + (hash(p, 21) - 0.5) * 0.3;
    for (let y = 0; y < size; y++) {
      const grain = fbm(p * 5 + 0.3, y / 18, 9, 3);
      const ll = l * (0.85 + (grain - 0.5) * 0.4);
      ctx.fillStyle = `rgb(${170 * ll | 0},${120 * ll | 0},${64 * ll | 0})`;
      ctx.fillRect(p * pw, y, pw, 1);
    }
    ctx.fillStyle = 'rgba(40,20,5,0.55)'; ctx.fillRect(p * pw, 0, 2, size);
    ctx.fillStyle = 'rgba(255,230,180,0.14)'; ctx.fillRect(p * pw + 2, 0, 2, size);
    for (let k = 0; k < 3; k++) { const y = hash(p, k + 40) * size; ctx.fillStyle = 'rgba(60,35,15,0.5)'; ctx.beginPath(); ctx.arc(p * pw + pw * 0.5, y, 2, 0, Math.PI * 2); ctx.fill(); }
  }
  return finish(c);
}

export function dirtTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x / 40, y / 40, 5, 4);
    const l = 0.7 + (n - 0.5) * 0.5;
    const i = (y * size + x) * 4;
    img.data[i] = 128 * l; img.data[i + 1] = 98 * l; img.data[i + 2] = 64 * l; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < size * 2; i++) { const x = hash(i, 61) * size, y = hash(i, 62) * size; ctx.fillStyle = hash(i, 63) > 0.5 ? 'rgba(255,240,220,0.12)' : 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.arc(x, y, 1 + hash(i, 64) * 2, 0, Math.PI * 2); ctx.fill(); }
  return finish(c);
}

/** Cloth banner with an emblem, tinted per team. */
export function bannerTexture(color: string, emblem: 'crown' | 'skull' = 'crown'): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 192);
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 192);
  for (let y = 0; y < 192; y += 3) { ctx.fillStyle = `rgba(0,0,0,${0.05 + (y % 6 === 0 ? 0.04 : 0)})`; ctx.fillRect(0, y, 128, 1); }
  ctx.fillStyle = 'rgba(255,230,120,0.95)';
  ctx.strokeStyle = 'rgba(60,40,0,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath();
  if (emblem === 'crown') { ctx.moveTo(30, 120); ctx.lineTo(30, 70); ctx.lineTo(50, 92); ctx.lineTo(64, 58); ctx.lineTo(78, 92); ctx.lineTo(98, 70); ctx.lineTo(98, 120); ctx.closePath(); }
  else { ctx.arc(64, 90, 30, 0, Math.PI * 2); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, 128, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function particleTexture(size = 64): THREE.CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sky gradient texture (kept for compatibility; the arena uses a shader dome). */
export function skyTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#4f6e45');
  g.addColorStop(0.47, '#9dbb9a');
  g.addColorStop(0.5, '#c9dff2');
  g.addColorStop(0.53, '#a9cdec');
  g.addColorStop(0.7, '#3f83c8');
  g.addColorStop(1, '#173a70');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
