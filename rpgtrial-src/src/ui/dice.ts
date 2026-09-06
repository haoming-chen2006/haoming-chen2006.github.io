// The BG3 roll screen: a 3D d20 (three.js icosahedron with a numbered face atlas) that tumbles and lands on the
// rolled number, then the modifier breakdown, total and SUCCESS / FAILURE. Space / click continues.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { RollResult } from '../core/events.ts';
import { h, ornament, sfx, esc } from './dom.ts';
import { SKILL_NAME, ABILITY_NAME } from './content.ts';

export interface DiceUI {
  el: HTMLElement;
  showRoll(roll: RollResult, onDone: () => void): void;
  key(code: string): boolean;
  isOpen(): boolean;
  /** Build the renderer + compile shaders ahead of the first roll (call during loading / idle). */
  warm(): void;
}

const KIND_LABEL: Record<RollResult['kind'], string> = { attack: 'Attack roll', save: 'Saving throw', check: 'Ability check', damage: 'Damage', initiative: 'Initiative' };

export function createDice(opts: { env?: boolean } = {}): DiceUI {
  const useEnv = opts.env !== false;
  const kind = h('div.dice-kind'); const label = h('div.dice-label'); const dc = h('div.dice-dc');
  const canvas = h('canvas'); const glow = h('div.glow'); const face = h('div.dice-face'); const rays = h('div.dice-rays');
  const stage = h('div.dice-stage', rays, glow, canvas, face);
  const brk = h('div.dice-break'); const total = h('div.dice-total'); const result = h('div.dice-result'); const crit = h('div.dice-crit');
  const hint = h('div.dice-hint', 'Space · click to continue');
  const panel = ornament(h('div.panel.blur.dice-panel', kind, label, dc, stage, brk, total, result, crit, hint));
  const el = h('div#dice', h('div.veil'), panel);

  // ---- three.js die ----
  let renderer: THREE.WebGLRenderer | null = null; let scene: THREE.Scene; let camera: THREE.PerspectiveCamera; let die: THREE.Group;
  let faceQuats: THREE.Quaternion[] = [];
  const SIZE = 300;
  function initThree() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20); camera.position.set(0, 0, 5.4); camera.lookAt(0, 0, 0);
    if (useEnv) { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); }
    const key = new THREE.DirectionalLight(0xffe2b0, useEnv ? 2.2 : 3.2); key.position.set(2, 3.5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fa8ff, useEnv ? 1.2 : 1.8); rim.position.set(-3, -1, 2.5); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x404050, useEnv ? 0.6 : 1.4));
    die = new THREE.Group(); scene.add(die);
    const raw = new THREE.IcosahedronGeometry(1.25, 0); const geo = raw.index ? raw.toNonIndexed() : raw;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute; const uv = new Float32Array(60 * 2);
    const cols = 5, rows = 4, T = 256; const W = cols * T, H = rows * T;
    const tri = [[0.5, 0.09], [0.06, 0.9], [0.94, 0.9]];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
    g.fillStyle = '#0d0f16'; g.fillRect(0, 0, W, H);
    const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), cen = new THREE.Vector3(), n = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3();
    for (let f = 0; f < 20; f++) {
      const col = f % cols, row = Math.floor(f / cols); const ox = col * T, oy = row * T;
      // draw the tile: dark obsidian face with a gilded inset border and the number at the centroid
      const grad = g.createRadialGradient(ox + T / 2, oy + T * 0.6, 10, ox + T / 2, oy + T * 0.6, T * 0.75);
      grad.addColorStop(0, '#2b2f40'); grad.addColorStop(0.7, '#141726'); grad.addColorStop(1, '#0b0d15');
      g.fillStyle = grad; g.fillRect(ox, oy, T, T);
      g.strokeStyle = 'rgba(214,178,94,.55)'; g.lineWidth = 5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(ox + T * 0.5, oy + T * 0.2); g.lineTo(ox + T * 0.17, oy + T * 0.83); g.lineTo(ox + T * 0.83, oy + T * 0.83); g.closePath(); g.stroke();
      const num = f + 1; const cx = ox + T / 2, cy = oy + T * 0.63;
      g.font = `700 ${T * 0.36}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tg = g.createLinearGradient(0, cy - T * 0.18, 0, cy + T * 0.18); tg.addColorStop(0, '#fbe9b8'); tg.addColorStop(0.5, '#e2bf6a'); tg.addColorStop(1, '#a37f36');
      g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.fillStyle = tg; g.fillText(String(num), cx, cy);
      g.shadowBlur = 0; g.shadowOffsetY = 0;
      if (num === 6 || num === 9) { g.fillStyle = '#e2bf6a'; g.fillRect(cx - T * 0.09, cy + T * 0.2, T * 0.18, T * 0.025); }
      // uvs
      for (let j = 0; j < 3; j++) { const [tx, ty] = tri[j]; uv[(f * 3 + j) * 2] = (col + tx) / cols; uv[(f * 3 + j) * 2 + 1] = 1 - (row + ty) / rows; }
      // landing orientation: face normal → +Z, centroid→v0 direction → +Y
      v0.fromBufferAttribute(pos, f * 3); v1.fromBufferAttribute(pos, f * 3 + 1); v2.fromBufferAttribute(pos, f * 3 + 2);
      cen.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3); n.copy(cen).normalize(); up.copy(v0).sub(cen).normalize(); right.crossVectors(up, n).normalize();
      const m = new THREE.Matrix4().makeBasis(right, up, n).transpose();
      faceQuats.push(new THREE.Quaternion().setFromRotationMatrix(m));
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.32, envMapIntensity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat); die.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0xd6b25e, transparent: true, opacity: 0.85 }));
    edges.scale.setScalar(1.003); die.add(edges);
  }

  // ---- animation ----
  let open = false; let raf = 0; let done: (() => void) | null = null; let t0 = 0; let landed = false; let cur: RollResult | null = null;
  let qStart = new THREE.Quaternion(); let qEnd = new THREE.Quaternion(); const qTmp = new THREE.Quaternion();
  const spinAxis = new THREE.Vector3(); let spinPhaseEnd = 0; let timers: number[] = [];
  const ROLL = 1.35, SETTLE = 0.55;

  function frame() {
    if (!open || !renderer) return;
    const t = (performance.now() - t0) / 1000;
    if (t < ROLL) {
      // tumble: fast spin decaying, with bounce
      const k = t / ROLL; const w = 22 * (1 - k * 0.75);
      qTmp.setFromAxisAngle(spinAxis, w * 0.016); die.quaternion.multiply(qTmp);
      spinAxis.x += (Math.random() - .5) * 0.05; spinAxis.y += (Math.random() - .5) * 0.05; spinAxis.normalize();
      die.position.y = Math.abs(Math.sin(t * 9)) * 0.35 * (1 - k);
      die.scale.setScalar(1 + Math.sin(t * 9) * 0.03 * (1 - k));
      qStart.copy(die.quaternion); spinPhaseEnd = t;
    } else if (t < ROLL + SETTLE) {
      const k = (t - ROLL) / SETTLE; const e = 1 - Math.pow(1 - k, 3);
      die.quaternion.slerpQuaternions(qStart, qEnd, e); die.position.y *= 0.9; die.scale.setScalar(1 + (1 - e) * 0.02);
    } else {
      die.quaternion.copy(qEnd); die.position.y = 0; die.scale.setScalar(1);
      if (!landed) land();
      // gentle idle wobble
      const w = (t - ROLL - SETTLE); qTmp.setFromEuler(new THREE.Euler(Math.sin(w * 1.3) * 0.03, Math.sin(w * 0.9) * 0.05, 0)); die.quaternion.copy(qEnd).multiply(qTmp);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function land() {
    landed = true; const r = cur!;
    face.textContent = String(r.d20); face.className = 'dice-face on' + (r.crit === 'hit' ? ' nat20' : r.crit === 'miss' ? ' nat1' : '');
    glow.classList.add('on'); glow.classList.toggle('bad', r.success === false);
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    later(350, () => { brk.classList.add('on'); });
    later(650, () => { total.classList.add('on'); });
    later(950, () => {
      if (r.success !== undefined) {
        result.textContent = r.kind === 'attack' ? (r.success ? 'Hit' : 'Miss') : r.success ? 'Success' : 'Failure';
        result.className = 'dice-result on ' + (r.success ? 'ok' : 'bad');
        sfx(r.success ? 'success' : 'fail'); if (r.success) rays.classList.add('on');
      } else { result.textContent = String(r.total); result.className = 'dice-result on ok'; }
      if (r.crit === 'hit') crit.textContent = 'Natural 20 — critical success'; else if (r.crit === 'miss') crit.textContent = 'Natural 1 — critical failure'; else crit.textContent = r.advantage === 'adv' ? 'Rolled with advantage' : r.advantage === 'dis' ? 'Rolled with disadvantage' : '';
      crit.classList.add('on');
    });
    later(1250, () => hint.classList.add('on'));
  }
  function skipToEnd() {
    if (landed) return;
    t0 = performance.now() - (ROLL + SETTLE) * 1000 - 1;
  }
  function labelFor(r: RollResult) {
    const raw = r.label || KIND_LABEL[r.kind];
    const key = raw.replace(/\s*(check|save|saving throw|roll)$/i, '').trim();
    return SKILL_NAME[key] ?? ABILITY_NAME[key.toLowerCase()] ?? key;
  }
  function showRoll(roll: RollResult, onDone: () => void) {
    initThree();
    cur = roll; done = onDone; landed = false; for (const t of timers) clearTimeout(t); timers = [];
    kind.textContent = KIND_LABEL[roll.kind] + (roll.advantage === 'adv' ? ' · advantage' : roll.advantage === 'dis' ? ' · disadvantage' : '');
    label.textContent = labelFor(roll);
    dc.innerHTML = roll.dc !== undefined ? (roll.kind === 'attack' ? `Armour class <b>${roll.dc}</b>` : `Difficulty class <b>${roll.dc}</b>`) : '';
    face.className = 'dice-face'; glow.className = 'glow'; rays.className = 'dice-rays';
    brk.className = 'dice-break'; total.className = 'dice-total'; result.className = 'dice-result'; crit.className = 'dice-crit'; hint.className = 'dice-hint';
    const mod = roll.bonus - (roll.bonusDice ?? []).reduce((s, d) => s + d.value, 0);
    const chips = [`<span class="chip d">d20 · ${roll.d20}</span>`];
    if (mod) chips.push(`<span class="op">${mod >= 0 ? '+' : '−'}</span><span class="chip">${Math.abs(mod)} modifier</span>`);
    for (const d of roll.bonusDice ?? []) chips.push(`<span class="op">${d.value >= 0 ? '+' : '−'}</span><span class="chip bd">${esc(d.label)} ${Math.abs(d.value)}</span>`);
    brk.innerHTML = chips.join('');
    total.innerHTML = `Total <b>${roll.total}</b>`;
    // die setup
    const idx = Math.max(0, Math.min(19, roll.d20 - 1)); qEnd.copy(faceQuats[idx]);
    die.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    spinAxis.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
    t0 = performance.now();
    if (!open) { open = true; el.classList.add('on'); sfx('dice'); }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function finish() {
    if (!open) return;
    if (!landed) { skipToEnd(); return; }
    open = false; el.classList.remove('on'); cancelAnimationFrame(raf); for (const t of timers) clearTimeout(t);
    const fn = done; done = null; sfx('close'); fn?.();
  }
  el.addEventListener('click', finish);
  function key(code: string) {
    if (!open) return false;
    if (code === 'Space' || code === 'Enter' || code === 'KeyE' || code === 'Escape') { finish(); return true; }
    return true;
  }
  function warm() { try { initThree(); die.quaternion.copy(faceQuats[19]); renderer!.render(scene, camera); } catch (e) { console.warn('[dice] warm failed', e); } }
  return { el, showRoll, key, isOpen: () => open, warm };
}
