// Dusk sky for the Hollowmere: procedural dome (gradient, sun, glow, clouds, moon, stars), sun light with a
// texel-snapped shadow frustum, HDRI environment for PBR, and a shared height/sun-tinted fog patch.
import * as THREE from 'three';
import { assets } from './assets.ts';
import type { QualitySettings } from './quality.ts';

/** Direction from the world toward the sun (north-west over the lake, ~14° up). */
export const SUN_DIR = new THREE.Vector3(-0.42, 0.25, -0.88).normalize();
export const MOON_DIR = new THREE.Vector3(0.62, 0.30, 0.72).normalize();
export const SUN_COLOR = new THREE.Color(1.0, 0.70, 0.42);
/** Fog colour at the horizon away from the sun (teal-violet blue hour). */
export const FOG_COLOR = new THREE.Color(0.35, 0.37, 0.50);
export const FOG_SUN_COLOR = new THREE.Color(0.92, 0.62, 0.40);
export const FOG_DENSITY = 0.0046;

/** Uniforms shared by every material patched with applyHeightFog(); updated by Sky.update(). */
export const fogUniforms = {
  uSunDir: { value: SUN_DIR.clone() },
  uFogSunColor: { value: FOG_SUN_COLOR.clone() },
  uFogHeightFalloff: { value: 0.045 },
  uFogBase: { value: -2.0 },
  uTime: { value: 0 },
};

/**
 * Replace three's FogExp2 with an exponential height fog tinted toward the sun. Works on any material that
 * includes <fog_fragment> (Standard/Physical/Lambert/Basic) and on instanced meshes.
 */
export function applyHeightFog(mat: THREE.Material, extra?: (shader: THREE.WebGLProgramParametersWithUniforms) => void) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    Object.assign(shader.uniforms, fogUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHFWorldPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
#ifdef USE_INSTANCING
  vHFWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vHFWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vHFWorldPos;
uniform vec3 uSunDir; uniform vec3 uFogSunColor; uniform float uFogHeightFalloff; uniform float uFogBase;`)
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
  {
    vec3 hfView = vHFWorldPos - cameraPosition;
    float hfDist = length(hfView);
    // exponential height fog: integrate density along the ray (analytic for exp falloff)
    float hfA = uFogHeightFalloff;
    float dy = vHFWorldPos.y - cameraPosition.y;
    float hfInt = abs(dy) > 0.01 ? (exp(-hfA * (cameraPosition.y - uFogBase)) - exp(-hfA * (vHFWorldPos.y - uFogBase))) / (hfA * dy) : exp(-hfA * (cameraPosition.y - uFogBase));
    float hfDensity = fogDensity * clamp(hfInt, 0.0, 4.0);
    float fogFactor = 1.0 - exp(-hfDensity * hfDensity * hfDist * hfDist);
    float sunAmt = pow(max(dot(hfView / max(hfDist, 0.001), uSunDir), 0.0), 6.0);
    vec3 hfCol = mix(fogColor, uFogSunColor, sunAmt * 0.7);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, hfCol, clamp(fogFactor, 0.0, 1.0));
  }
#endif`);
    extra?.(shader);
  };
  mat.customProgramCacheKey = () => (mat.type ?? '') + ':heightfog';
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w * 0.99999; // stay behind everything
}`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir; uniform vec3 uMoonDir; uniform vec3 uSunColor;
uniform vec3 uZenith; uniform vec3 uHorizonCool; uniform vec3 uHorizonWarm; uniform vec3 uGround;
uniform float uTime; uniform float uCloudCover; uniform float uStars;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

void main() {
  vec3 d = normalize(vDir);
  float mu = dot(d, uSunDir);
  float h = d.y;
  // --- gradient
  float hz = pow(1.0 - clamp(h, 0.0, 1.0), 3.5);
  float warm = pow(max(mu, 0.0), 2.0) * 0.6 + pow(max(mu, 0.0), 12.0) * 0.4;
  vec3 horizon = mix(uHorizonCool, uHorizonWarm, warm);
  vec3 sky = mix(uZenith, horizon, hz);
  // warmth bleeding upward near the sun
  sky += uHorizonWarm * pow(max(mu, 0.0), 6.0) * 0.25 * (1.0 - h);
  // --- sun: mie glow + disc
  sky += uSunColor * (0.0045 / max(1.0 - mu * 0.9995, 0.0006)) * smoothstep(-0.15, 0.15, h + 0.08);
  float disc = smoothstep(0.99925, 0.99975, mu);
  sky += uSunColor * disc * 22.0;
  // --- clouds: thin dusk bands, lit from the sun side
  if (h > -0.02) {
    vec2 p = d.xz / (h + 0.12) * 1.6;
    vec2 wind = vec2(0.012, 0.004) * uTime;
    float n = fbm(p * 0.9 + wind);
    float n2 = fbm(p * 2.7 - wind * 1.7 + 4.2);
    float cov = smoothstep(0.52 - uCloudCover * 0.18, 0.78, n * 0.75 + n2 * 0.25);
    float horizonFade = smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.35, 0.9, h) * 0.6);
    cov *= horizonFade;
    vec3 cloudLit = mix(uHorizonWarm * 1.15, uSunColor * 1.3, pow(max(mu, 0.0), 3.0));
    vec3 cloudDark = mix(uZenith * 1.4, uHorizonCool * 0.75, hz);
    float lit = pow(max(mu, 0.0), 1.5) * 0.85 + 0.15;
    vec3 cloud = mix(cloudDark, cloudLit, lit * (1.0 - n2 * 0.35));
    sky = mix(sky, cloud, cov * 0.85);
  }
  // --- stars (faint at dusk, denser away from the sun)
  {
    vec3 sd = d * 90.0; vec3 cell = floor(sd); vec3 f = fract(sd) - 0.5;
    float r = hash13(cell); vec3 off = vec3(hash13(cell + 1.7), hash13(cell + 3.1), hash13(cell + 5.3)) - 0.5;
    float star = smoothstep(0.08, 0.0, length(f - off * 0.8)) * step(0.94, r);
    float tw = 0.7 + 0.3 * sin(uTime * 2.0 + r * 40.0);
    float dark = smoothstep(0.1, 0.65, h) * (1.0 - smoothstep(-0.2, 0.7, mu)) * uStars;
    sky += vec3(0.9, 0.95, 1.0) * star * tw * dark * 2.0;
  }
  // --- moon
  {
    float mm = dot(d, uMoonDir);
    float ang = 0.0075;
    vec3 t = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))); vec3 b = cross(t, uMoonDir);
    vec2 uv = vec2(dot(d - uMoonDir, t), dot(d - uMoonDir, b)) / ang;
    float rr = dot(uv, uv);
    if (rr < 1.4) {
      float mask = smoothstep(1.05, 0.9, rr);
      vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - rr)));
      vec3 l = normalize(vec3(dot(uSunDir, t), dot(uSunDir, b), dot(uSunDir, uMoonDir)));
      float lit = max(dot(n, l), 0.0);
      float mar = 0.75 + 0.25 * vnoise(uv * 5.0 + 3.0);
      vec3 moon = vec3(0.86, 0.88, 0.95) * (lit * 1.4 + 0.06) * mar;
      float vis = smoothstep(0.05, 0.4, h);
      sky = mix(sky, moon, mask * vis * 0.9);
    }
    sky += vec3(0.6, 0.68, 0.85) * 0.02 / max(1.0 - mm * 0.9995, 0.002) * 0.02 * smoothstep(0.0, 0.3, h);
  }
  // --- below the horizon: fade to the ground/fog colour
  sky = mix(sky, uGround, smoothstep(0.0, -0.08, h));
  gl_FragColor = vec4(sky, 1.0);
}`;

export class Sky {
  group = new THREE.Group();
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  dome: THREE.Mesh;
  sunSprite: THREE.Mesh;
  sunPosition = new THREE.Vector3();
  fogColor = FOG_COLOR.clone();
  uniforms = {
    uSunDir: { value: SUN_DIR.clone() }, uMoonDir: { value: MOON_DIR.clone() }, uSunColor: { value: SUN_COLOR.clone() },
    uZenith: { value: new THREE.Color(0.07, 0.12, 0.32) },
    uHorizonCool: { value: new THREE.Color(0.40, 0.42, 0.60) },
    uHorizonWarm: { value: new THREE.Color(0.95, 0.52, 0.26) },
    uGround: { value: FOG_COLOR.clone() },
    uTime: { value: 0 }, uCloudCover: { value: 0.55 }, uStars: { value: 0.6 },
  };
  private shadowHalf = 42;
  private time = 0;

  constructor(public scene: THREE.Scene, private quality: QualitySettings) {
    scene.add(this.group);
    // sun
    this.sun = new THREE.DirectionalLight(SUN_COLOR, 4.6);
    this.sun.castShadow = quality.shadows;
    const sc = this.sun.shadow.camera; const s = this.shadowHalf;
    sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 1; sc.far = 260;
    this.sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    this.sun.shadow.bias = -0.00025; this.sun.shadow.normalBias = 0.06; this.sun.shadow.radius = 1.5;
    this.group.add(this.sun, this.sun.target);
    // ambient: hemisphere gives the cool teal shadow fill, env map gives the specular/diffuse IBL
    this.hemi = new THREE.HemisphereLight(new THREE.Color(0.34, 0.46, 0.78), new THREE.Color(0.22, 0.19, 0.14), 0.5);
    this.group.add(this.hemi);
    scene.fog = new THREE.FogExp2(this.fogColor.getHex(), FOG_DENSITY);
    scene.background = null;
    // dome
    const geo = new THREE.SphereGeometry(1, 48, 32);
    const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false });
    this.dome = new THREE.Mesh(geo, mat); this.dome.scale.setScalar(1200); this.dome.frustumCulled = false; this.dome.renderOrder = -1000;
    this.group.add(this.dome);
    // emissive sun disc very far away (for god rays in the post stack)
    const sg = new THREE.CircleGeometry(1, 40);
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.6).multiplyScalar(8), fog: false, depthWrite: false, toneMapped: false });
    this.sunSprite = new THREE.Mesh(sg, sm); this.sunSprite.frustumCulled = false; this.sunSprite.renderOrder = -999; this.sunSprite.scale.setScalar(14);
    this.group.add(this.sunSprite);
    // environment map (reflections + IBL). Rotated so the HDRI sun lines up with SUN_DIR.
    assets.hdr('hdri/kloppenheim_06_puresky_2k.hdr').then((t) => {
      scene.environment = t;
      scene.environmentIntensity = 0.28;
      scene.environmentRotation.set(0, 2.69, 0);
    }).catch((e) => console.warn('hdri failed', e));
  }

  update(dt: number, camPos: THREE.Vector3, focus: THREE.Vector3) {
    this.time += dt;
    this.uniforms.uTime.value = this.time; fogUniforms.uTime.value = this.time;
    this.dome.position.copy(camPos);
    this.sunPosition.copy(camPos).addScaledVector(SUN_DIR, 1000);
    this.sunSprite.position.copy(camPos).addScaledVector(SUN_DIR, 1100);
    this.sunSprite.lookAt(camPos);
    // shadow frustum follows the player, snapped to shadow-map texels to avoid crawling edges
    const texel = (this.shadowHalf * 2) / this.quality.shadowMap;
    const lightMat = new THREE.Matrix4().lookAt(SUN_DIR, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    const inv = lightMat.clone().invert();
    const f = focus.clone().addScaledVector(SUN_DIR, 0); f.y += 2;
    const ls = f.clone().applyMatrix4(inv);
    ls.x = Math.round(ls.x / texel) * texel; ls.y = Math.round(ls.y / texel) * texel;
    const snapped = ls.applyMatrix4(lightMat);
    this.sun.target.position.copy(snapped);
    this.sun.position.copy(snapped).addScaledVector(SUN_DIR, 160);
    this.sun.target.updateMatrixWorld(); this.sun.updateMatrixWorld();
  }
}
