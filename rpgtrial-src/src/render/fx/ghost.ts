// Afterimage ghosts: snapshot a character's skinned pose (bone world matrices) into static SkinnedMesh copies that
// fade out — used for dodge rolls (3 staggered copies) and could serve blinks/teleports.
import * as THREE from 'three';
import { FX_LAYER } from './common.ts';

const GHOST_VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN; varying vec3 vV;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(normalMatrix * objectNormal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const GHOST_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uFade; uniform float uIntensity; varying vec3 vN; varying vec3 vV;
void main() {
  float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float a = (0.18 + fr * 0.9) * uFade;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), fr * 0.5) * uIntensity, a);
}`;

interface Ghost { group: THREE.Group; mats: THREE.ShaderMaterial[]; age: number; life: number }

export class Ghosts {
  private ghosts: Ghost[] = [];
  constructor(private scene: THREE.Scene) {}

  spawn(root: THREE.Object3D, color: THREE.ColorRepresentation, life = 0.42, intensity = 1.8) {
    root.updateWorldMatrix(true, true);
    const group = new THREE.Group(); group.name = 'ghost'; group.matrixAutoUpdate = false;
    const mats: THREE.ShaderMaterial[] = [];
    const mkMat = () => { const m = new THREE.ShaderMaterial({ vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.FrontSide, uniforms: { uColor: { value: new THREE.Color(color) }, uFade: { value: 1 }, uIntensity: { value: intensity } } }); mats.push(m); return m; };
    root.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh || !m.visible) return;
      // skip hidden ancestors
      let p: THREE.Object3D | null = m.parent; while (p && p !== root) { if (!p.visible) return; p = p.parent; }
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) {
        const src = sm.skeleton; const bones = src.bones.map((b) => { const nb = new THREE.Bone(); nb.matrixAutoUpdate = false; nb.matrixWorld.copy(b.matrixWorld); return nb; });
        const skel = new THREE.Skeleton(bones, src.boneInverses.map((bi) => bi.clone()));
        const g = new THREE.SkinnedMesh(sm.geometry, mkMat()); g.frustumCulled = false; g.matrixAutoUpdate = false;
        g.bind(skel, sm.bindMatrix.clone()); g.bindMode = THREE.DetachedBindMode; g.bindMatrixInverse.copy(sm.bindMatrix).invert();
        // detached mode: world = bones * bindMatrix * pos, so the ghost itself sits at the origin with identity matrix
        skel.update(); g.layers.set(FX_LAYER); g.renderOrder = 7; group.add(g);
      } else {
        const g = new THREE.Mesh(m.geometry, mkMat()); g.frustumCulled = false; g.matrixAutoUpdate = false; g.matrixWorld.copy(m.matrixWorld); g.matrix.copy(m.matrixWorld);
        g.layers.set(FX_LAYER); g.renderOrder = 7; group.add(g);
      }
    });
    this.scene.add(group);
    this.ghosts.push({ group, mats, age: 0, life });
  }
  update(dt: number) {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i]; g.age += dt; const t = g.age / g.life;
      if (t >= 1) { this.scene.remove(g.group); for (const m of g.mats) m.dispose(); g.group.traverse((o) => { const sk = (o as THREE.SkinnedMesh).skeleton; if (sk) sk.dispose(); }); this.ghosts.splice(i, 1); continue; }
      const f = Math.pow(1 - t, 1.4); for (const m of g.mats) m.uniforms.uFade.value = f;
    }
  }
}
