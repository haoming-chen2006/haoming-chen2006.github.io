// The Hollowmere lake: planar reflection (when quality.waterReflection) with an analytic-sky fallback, animated
// normal-mapped ripples, depth-based colour + shore foam from a per-vertex depth attribute (terrainHeight), sun
// glints, height fog, and two drifting mist sheets just above the surface.
import * as THREE from 'three';
import { terrainHeight, fbm } from '../sim/terrain.ts';
import { LAKE } from '../content/level.ts';
import { SUN_COLOR, FOG_COLOR, fogUniforms, FOG_DENSITY } from './sky.ts';
import type { QualitySettings } from './quality.ts';

/** Layer for things that should not show in reflections (grass, small foliage). */
export const DETAIL_LAYER = 1;

function makeWaterNormalTexture(size = 256): THREE.DataTexture {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size) * 6, v = (y / size) * 6;
    h[y * size + x] = fbm(u, v, 4, 2.1, 0.55) * 0.6 + fbm(u * 3.1 + 7, v * 3.1 + 3, 3, 2.0, 0.5) * 0.25;
  }
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * size * 0.06, dy = (at(x, y + 1) - at(x, y - 1)) * size * 0.06;
    const l = Math.hypot(dx, dy, 1); const i = (y * size + x) * 4;
    data[i] = ((-dx / l) * 0.5 + 0.5) * 255; data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255; data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

/** Disc grid (spacing `step`) around the lake with a per-vertex water depth (negative above the shoreline). */
function makeLakeGeometry(radius: number, step: number, yOffset = 0): THREE.BufferGeometry {
  const n = Math.ceil((radius * 2) / step) + 1;
  const pos: number[] = [], depth: number[] = [], idx: number[] = []; const map = new Int32Array(n * n).fill(-1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = LAKE.x - radius + i * step, z = LAKE.z - radius + j * step;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) > radius + step) continue;
    map[j * n + i] = pos.length / 3;
    pos.push(x, LAKE.level + yOffset, z); depth.push(LAKE.level - terrainHeight(x, z));
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = map[j * n + i], b = map[j * n + i + 1], c = map[(j + 1) * n + i], d = map[(j + 1) * n + i + 1];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('depth', new THREE.Float32BufferAttribute(depth, 1));
  g.setIndex(idx); g.computeBoundingSphere();
  return g;
}

const FOG_GLSL = /* glsl */ `
uniform vec3 uFogColor; uniform float uFogDensity; uniform vec3 uSunDir; uniform vec3 uFogSunColor; uniform float uFogHeightFalloff; uniform float uFogBase;
vec3 applyFog(vec3 col, vec3 wp) {
  vec3 v = wp - cameraPosition; float dist = length(v);
  float a = uFogHeightFalloff; float dy = wp.y - cameraPosition.y;
  float integ = abs(dy) > 0.01 ? (exp(-a * (cameraPosition.y - uFogBase)) - exp(-a * (wp.y - uFogBase))) / (a * dy) : exp(-a * (cameraPosition.y - uFogBase));
  float dens = uFogDensity * clamp(integ, 0.0, 4.0);
  float f = 1.0 - exp(-dens * dens * dist * dist);
  float sunAmt = pow(max(dot(v / max(dist, 0.001), uSunDir), 0.0), 6.0);
  return mix(col, mix(uFogColor, uFogSunColor, sunAmt * 0.85), clamp(f, 0.0, 1.0));
}`;

const WATER_VERT = /* glsl */ `
attribute float depth;
varying vec3 vWPos; varying float vDepth; varying vec4 vClip;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz; vDepth = depth;
  vClip = projectionMatrix * viewMatrix * wp;
  gl_Position = vClip;
}`;
const WATER_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWPos; varying float vDepth; varying vec4 vClip;
uniform sampler2D uNormalMap; uniform sampler2D uNoise; uniform sampler2D uReflection; uniform float uHasReflection;
uniform float uTime; uniform vec3 uSunColor; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uHorizonWarm;
${FOG_GLSL}
vec3 skyApprox(vec3 d) {
  float h = clamp(d.y, 0.0, 1.0);
  float mu = max(dot(d, uSunDir), 0.0);
  vec3 hor = mix(uHorizon, uHorizonWarm, pow(mu, 2.0));
  vec3 s = mix(hor, uZenith, pow(h, 0.55));
  s += uSunColor * (0.008 / max(1.0 - mu * 0.9995, 0.001)) * 0.35;
  return s;
}
void main() {
  vec3 V = normalize(cameraPosition - vWPos);
  float dist = length(cameraPosition - vWPos);
  float dpt = max(vDepth, 0.0);
  // ripples: two scrolling layers + a slow large swell; calmer in the shallows
  vec2 p = vWPos.xz;
  vec3 n1 = texture2D(uNormalMap, p * 0.11 + uTime * vec2(0.021, 0.014)).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(uNormalMap, p * 0.047 - uTime * vec2(0.012, 0.019) + 0.37).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(uNormalMap, p * 0.013 + uTime * vec2(0.004, -0.006)).xyz * 2.0 - 1.0;
  float calm = 0.55 + 0.45 * smoothstep(0.0, 1.5, dpt);
  float bump = 0.13 * calm / (1.0 + dist * 0.012);
  vec3 n = normalize(vec3((n1.x + n2.x * 0.7 + n3.x * 0.5) * bump, 1.0, (n1.y + n2.y * 0.7 + n3.y * 0.5) * bump));
  // fresnel
  float NdV = max(dot(n, V), 0.0);
  float fres = 0.02 + 0.85 * pow(1.0 - NdV, 5.0);
  // reflection
  vec3 R = reflect(-V, n); R.y = abs(R.y);
  vec3 refl;
  if (uHasReflection > 0.5) {
    vec2 ruv = vClip.xy / vClip.w * 0.5 + 0.5;
    ruv += n.xz * (0.09 / (1.0 + dist * 0.03));
    ruv = clamp(ruv, 0.002, 0.998);
    refl = texture2D(uReflection, ruv).rgb;
  } else {
    refl = skyApprox(R);
  }
  // body colour by depth (teal shallows → deep blue-black)
  vec3 shallow = vec3(0.10, 0.27, 0.25); vec3 deep = vec3(0.010, 0.035, 0.065);
  vec3 body = mix(shallow, deep, 1.0 - exp(-dpt * 0.5));
  // sun glints
  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(n, H), 0.0), 900.0) * 6.0 + pow(max(dot(n, H), 0.0), 60.0) * 0.12;
  vec3 col = mix(body, refl * 0.85, fres) + uSunColor * spec * (0.3 + fres);
  // shore foam
  float fn = texture2D(uNoise, p * 0.09 + uTime * vec2(0.01, 0.02)).g;
  float fn2 = texture2D(uNoise, p * 0.25 - uTime * vec2(0.03, 0.01)).r;
  float foamBand = (1.0 - smoothstep(0.0, 0.5, dpt)) * smoothstep(0.35, 0.7, fn * 0.6 + fn2 * 0.4 + 0.25 * sin(uTime * 0.8 + dpt * 9.0));
  col = mix(col, vec3(0.75, 0.8, 0.78), foamBand * 0.55);
  float alpha = smoothstep(-0.03, 0.22, vDepth) * (0.55 + 0.45 * (1.0 - exp(-dpt * 1.1)));
  alpha = max(alpha, foamBand * 0.6 * smoothstep(-0.05, 0.05, vDepth));
  col = applyFog(col, vWPos);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const MIST_VERT = /* glsl */ `
attribute float depth;
varying vec3 vWPos; varying float vDepth;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWPos = wp.xyz; vDepth = depth; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const MIST_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWPos; varying float vDepth;
uniform sampler2D uNoise; uniform float uTime; uniform float uOpacity; uniform vec2 uScroll; uniform float uScale;
${FOG_GLSL}
void main() {
  vec2 p = vWPos.xz * uScale;
  float n = texture2D(uNoise, p + uTime * uScroll).g;
  float n2 = texture2D(uNoise, p * 2.7 - uTime * uScroll * 1.6 + 0.3).r;
  float n3 = texture2D(uNoise, p * 0.35 + uTime * uScroll * 0.4 + 0.6).b;
  float a = smoothstep(0.38, 0.85, n * 0.55 + n2 * 0.25 + n3 * 0.3) * uOpacity;
  float dist = length(cameraPosition - vWPos);
  a *= smoothstep(-1.5, 4.0, vDepth);            // only over open water
  a *= smoothstep(4.0, 18.0, dist);              // never a sheet in the camera's face
  vec3 v = normalize(vWPos - cameraPosition);
  float sunAmt = pow(max(dot(v, uSunDir), 0.0), 4.0);
  vec3 col = mix(uFogColor * 1.08, uFogSunColor * 1.15, sunAmt);
  col = applyFog(col, vWPos);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Water {
  group = new THREE.Group();
  mesh: THREE.Mesh;
  mist: THREE.Mesh[] = [];
  material: THREE.ShaderMaterial;
  private rt: THREE.WebGLRenderTarget | null = null;
  private virtualCamera = new THREE.PerspectiveCamera();
  private time = 0;
  uniforms: Record<string, THREE.IUniform>;

  constructor(private quality: QualitySettings, noise: THREE.Texture) {
    const normalMap = makeWaterNormalTexture();
    this.uniforms = {
      uNormalMap: { value: normalMap }, uNoise: { value: noise }, uReflection: { value: null }, uHasReflection: { value: 0 },
      uTime: { value: 0 }, uSunColor: { value: SUN_COLOR.clone() },
      uZenith: { value: new THREE.Color(0.10, 0.16, 0.36) }, uHorizon: { value: new THREE.Color(0.55, 0.52, 0.64) }, uHorizonWarm: { value: new THREE.Color(1.0, 0.62, 0.32) },
      uFogColor: { value: FOG_COLOR.clone() }, uFogDensity: { value: FOG_DENSITY },
      uSunDir: fogUniforms.uSunDir, uFogSunColor: fogUniforms.uFogSunColor, uFogHeightFalloff: fogUniforms.uFogHeightFalloff, uFogBase: fogUniforms.uFogBase,
    };
    this.material = new THREE.ShaderMaterial({ vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, uniforms: this.uniforms, transparent: true, depthWrite: false, side: THREE.FrontSide });
    const geo = makeLakeGeometry(LAKE.r + 26, 0.75);
    this.mesh = new THREE.Mesh(geo, this.material); this.mesh.name = 'water'; this.mesh.renderOrder = 10; this.mesh.frustumCulled = true;
    this.group.add(this.mesh);
    if (quality.waterReflection) this.setupReflection();
    // mist sheets
    const mistGeo = makeLakeGeometry(LAKE.r + 14, 3, 0);
    const sheets = [{ y: 0.45, op: 0.32, scale: 0.016, scroll: [0.010, 0.006] }, { y: 1.3, op: 0.2, scale: 0.009, scroll: [-0.006, 0.011] }];
    for (const s of sheets) {
      const m = new THREE.ShaderMaterial({ vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uNoise: { value: noise }, uTime: this.uniforms.uTime, uOpacity: { value: s.op }, uScroll: { value: new THREE.Vector2(s.scroll[0], s.scroll[1]) }, uScale: { value: s.scale },
          uFogColor: this.uniforms.uFogColor, uFogDensity: this.uniforms.uFogDensity, uSunDir: fogUniforms.uSunDir, uFogSunColor: fogUniforms.uFogSunColor, uFogHeightFalloff: fogUniforms.uFogHeightFalloff, uFogBase: fogUniforms.uFogBase } });
      const mesh = new THREE.Mesh(mistGeo, m); mesh.position.y = s.y; mesh.renderOrder = 20; mesh.layers.enable(DETAIL_LAYER); mesh.name = 'mist';
      this.mist.push(mesh); this.group.add(mesh);
    }
  }

  private setupReflection() {
    const rt = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false });
    rt.texture.minFilter = THREE.LinearFilter; rt.texture.magFilter = THREE.LinearFilter;
    this.rt = rt; this.uniforms.uReflection.value = rt.texture; this.uniforms.uHasReflection.value = 1;
    const plane = new THREE.Plane(), normal = new THREE.Vector3(0, 1, 0), refPos = new THREE.Vector3(), camPos = new THREE.Vector3();
    const rot = new THREE.Matrix4(), lookAt = new THREE.Vector3(), view = new THREE.Vector3(), target = new THREE.Vector3(), clip = new THREE.Vector4(), q = new THREE.Vector4();
    const vcam = this.virtualCamera; const hidden: THREE.Object3D[] = [];
    this.mesh.onBeforeRender = (renderer, scene, camera) => {
      const cam = camera as THREE.PerspectiveCamera;
      refPos.set(LAKE.x, LAKE.level, LAKE.z); camPos.setFromMatrixPosition(cam.matrixWorld);
      view.subVectors(refPos, camPos); if (view.dot(normal) > 0) return;
      view.reflect(normal).negate().add(refPos);
      rot.extractRotation(cam.matrixWorld); lookAt.set(0, 0, -1).applyMatrix4(rot).add(camPos);
      target.subVectors(refPos, lookAt).reflect(normal).negate().add(refPos);
      vcam.position.copy(view); vcam.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal); vcam.lookAt(target);
      vcam.near = cam.near; vcam.far = cam.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(cam.projectionMatrix);
      plane.setFromNormalAndCoplanarPoint(normal, refPos); plane.applyMatrix4(vcam.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const pm = vcam.projectionMatrix;
      q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0]; q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5]; q.z = -1; q.w = (1 + pm.elements[10]) / pm.elements[14];
      clip.multiplyScalar(2 / clip.dot(q));
      pm.elements[2] = clip.x; pm.elements[6] = clip.y; pm.elements[10] = clip.z + 1 - 0.003; pm.elements[14] = clip.w;
      // size: half the drawing buffer
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      const w = Math.max(256, Math.floor(size.x * 0.5)), h = Math.max(256, Math.floor(size.y * 0.5));
      if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
      // grass / small foliage / mist stay out of the mirror (cost + they never read anyway)
      hidden.length = 0;
      scene.traverse((o) => { if (o.visible && o.layers.isEnabled(DETAIL_LAYER)) { o.visible = false; hidden.push(o); } });
      this.mesh.visible = false;
      const prevRT = renderer.getRenderTarget(), prevXr = renderer.xr.enabled, prevShadow = renderer.shadowMap.autoUpdate;
      renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, vcam);
      renderer.xr.enabled = prevXr; renderer.shadowMap.autoUpdate = prevShadow; renderer.setRenderTarget(prevRT);
      this.mesh.visible = true; for (const o of hidden) o.visible = true;
    };
  }

  update(dt: number) { this.time += dt; this.uniforms.uTime.value = this.time; }
}
