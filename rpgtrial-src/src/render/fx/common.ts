// Shared state between the renderer's FX pass and the particle/VFX materials. (Post-FX agent owns fx/**.)
import * as THREE from 'three';

/** Objects on this layer are drawn by the renderer's FxPass *after* AO, with soft-depth available. */
export const FX_LAYER = 1;

/** Soft-particle inputs filled by the renderer every frame. Materials reference these Uniform objects directly. */
export const SOFT = {
  depth: new THREE.Uniform<THREE.Texture | null>(null),
  resolution: new THREE.Uniform(new THREE.Vector2(1, 1)),
  nearFar: new THREE.Uniform(new THREE.Vector2(0.1, 1000)),
  enabled: new THREE.Uniform(0),
};

/** GLSL: declares the soft-depth uniforms + `softFade(viewZ, dist)` (1 = fully visible). Fragment-side. */
export const SOFT_GLSL = /* glsl */ `
uniform sampler2D uSoftDepth; uniform vec2 uSoftRes; uniform vec2 uSoftNearFar; uniform float uSoftOn;
float hmSceneDist(vec2 fragCoord) {
  float d = texture2D(uSoftDepth, fragCoord / uSoftRes).r;
  float n = uSoftNearFar.x, f = uSoftNearFar.y;
  // perspective depth -> positive view distance
  return (n * f) / (f - d * (f - n));
}
float softFade(float viewDist, float dist) {
  if (uSoftOn < 0.5) return 1.0;
  float s = hmSceneDist(gl_FragCoord.xy);
  return clamp((s - viewDist) / max(dist, 1e-4), 0.0, 1.0);
}
`;
export function softUniforms() {
  return { uSoftDepth: SOFT.depth, uSoftRes: SOFT.resolution, uSoftNearFar: SOFT.nearFar, uSoftOn: SOFT.enabled };
}

export const hashNoiseGLSL = /* glsl */ `
float hm_hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hm_hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 hm_hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float hm_noise(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hm_hash33(i).x, hm_hash33(i + vec3(1,0,0)).x, f.x), mix(hm_hash33(i + vec3(0,1,0)).x, hm_hash33(i + vec3(1,1,0)).x, f.x), f.y),
             mix(mix(hm_hash33(i + vec3(0,0,1)).x, hm_hash33(i + vec3(1,0,1)).x, f.x), mix(hm_hash33(i + vec3(0,1,1)).x, hm_hash33(i + vec3(1,1,1)).x, f.x), f.y), f.z); }
`;

export const tmpV3 = new THREE.Vector3();
export const tmpV3b = new THREE.Vector3();
export const tmpM4 = new THREE.Matrix4();
export const tmpQ = new THREE.Quaternion();
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
