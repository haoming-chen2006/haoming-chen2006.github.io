import * as THREE from 'three';

export type DecalKind = 'scorch' | 'frost' | 'cracks' | 'dust' | 'bones' | 'holy';

const hash = (x: number, y: number, s = 0): number => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

function makeTexture(kind: DecalKind): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  switch (kind) {
    case 'scorch': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.55, 'rgba(30,18,10,0.75)'); g.addColorStop(0.85, 'rgba(40,25,12,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; const r = size / 2 * (0.78 + hash(i, 1) * 0.22); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,40,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = hash(i, 2) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); ctx.lineTo(cx + Math.cos(a) * size * 0.35, cy + Math.sin(a) * size * 0.35); ctx.stroke(); }
      break;
    }
    case 'frost': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      g.addColorStop(0, 'rgba(210,240,255,0.85)'); g.addColorStop(0.7, 'rgba(170,220,255,0.55)'); g.addColorStop(1, 'rgba(170,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * size * 0.46, cy + Math.sin(a) * size * 0.46); ctx.stroke();
        for (let k = 1; k <= 3; k++) { const r = size * 0.12 * k; const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.6) * 14, by + Math.sin(a + 0.6) * 14); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - 0.6) * 14, by + Math.sin(a - 0.6) * 14); ctx.stroke(); }
      }
      break;
    }
    case 'cracks': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      g.addColorStop(0, 'rgba(40,30,20,0.7)'); g.addColorStop(0.6, 'rgba(50,38,25,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(15,10,5,0.9)'; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        let a = (i / 9) * Math.PI * 2 + hash(i, 3) * 0.5;
        let x = cx, y = cy, r = 0;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, y);
        while (r < size * 0.46) { const step = 12 + hash(i, r) * 12; r += step; a += (hash(i, r + 1) - 0.5) * 0.9; x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r; ctx.lineTo(x, y); ctx.lineWidth = Math.max(1, 4 * (1 - r / (size * 0.5))); }
        ctx.stroke();
      }
      break;
    }
    case 'dust': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      g.addColorStop(0, 'rgba(120,100,70,0.55)'); g.addColorStop(1, 'rgba(120,100,70,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bones': {
      ctx.strokeStyle = 'rgba(235,235,225,0.95)'; ctx.lineCap = 'round'; ctx.lineWidth = 7;
      for (let i = 0; i < 7; i++) { const a = hash(i, 5) * Math.PI * 2, r = 20 + hash(i, 6) * 60; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; const b = hash(i, 7) * Math.PI; ctx.beginPath(); ctx.moveTo(x - Math.cos(b) * 18, y - Math.sin(b) * 18); ctx.lineTo(x + Math.cos(b) * 18, y + Math.sin(b) * 18); ctx.stroke(); }
      ctx.fillStyle = 'rgba(235,235,225,0.95)'; ctx.beginPath(); ctx.arc(cx + 10, cy - 8, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(30,30,30,0.9)'; ctx.beginPath(); ctx.arc(cx + 4, cy - 12, 4, 0, Math.PI * 2); ctx.arc(cx + 16, cy - 12, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'holy': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      g.addColorStop(0, 'rgba(255,245,200,0.7)'); g.addColorStop(0.5, 'rgba(180,255,200,0.4)'); g.addColorStop(1, 'rgba(180,255,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2); ctx.stroke();
      break;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Decal { mesh: THREE.Mesh; t: number; life: number; kind: DecalKind }

/** Pooled ground decals (scorch marks, frost floors, cracks) that fade out. */
export class DecalPool {
  private scene: THREE.Scene;
  private textures = new Map<DecalKind, THREE.CanvasTexture>();
  private active: Decal[] = [];
  private free = new Map<DecalKind, THREE.Mesh[]>();
  private geo = new THREE.PlaneGeometry(2, 2);

  constructor(scene: THREE.Scene) { this.scene = scene; }

  private texture(kind: DecalKind): THREE.CanvasTexture {
    let t = this.textures.get(kind);
    if (!t) { t = makeTexture(kind); this.textures.set(kind, t); }
    return t;
  }

  spawn(kind: DecalKind, x: number, z: number, radius: number, life: number, y = 0.02, rotation = Math.random() * Math.PI * 2): THREE.Mesh {
    const pool = this.free.get(kind) ?? [];
    let mesh = pool.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ map: this.texture(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 2;
      this.scene.add(mesh);
    }
    mesh.visible = true;
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotation;
    mesh.scale.setScalar(radius);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 1;
    this.active.push({ mesh, t: 0, life, kind });
    return mesh;
  }

  update(dt: number): void {
    if (!this.active.length) return;
    this.active = this.active.filter((d) => {
      d.t += dt;
      const p = d.t / d.life;
      const m = d.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = p < 0.1 ? p / 0.1 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1;
      if (p >= 1) {
        d.mesh.visible = false;
        const pool = this.free.get(d.kind) ?? [];
        pool.push(d.mesh);
        this.free.set(d.kind, pool);
        return false;
      }
      return true;
    });
  }

  clear(): void {
    for (const d of this.active) { d.mesh.visible = false; const pool = this.free.get(d.kind) ?? []; pool.push(d.mesh); this.free.set(d.kind, pool); }
    this.active = [];
  }
}
