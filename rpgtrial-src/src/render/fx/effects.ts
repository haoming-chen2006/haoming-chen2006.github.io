// Custom pmndrs/postprocessing effects: gameplay overlay (CA / radial blur / flash / damage), colour grade, film grain.
import * as THREE from 'three';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';

/**
 * Pre-tonemap, HDR-space effect. Runs first in its pass (CONVOLUTION effects are sorted first).
 * - chromatic aberration (edge-weighted, tiny)
 * - radial blur (hit-stop / crit impact punch)
 * - damage vignette (pulsing red edge)
 * - full-screen flash (additive, so it blooms)
 */
export class HitFXEffect extends Effect {
  constructor() {
    super('HitFXEffect', /* glsl */ `
      uniform float uCA; uniform float uRadial; uniform vec2 uRadialCenter; uniform vec3 uFlashColor; uniform float uFlash; uniform float uDamage; uniform float uTime;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 d = uv - 0.5; d.x *= aspect; float r2 = dot(d, d);
        vec3 col = inputColor.rgb;
        float caw = uCA * smoothstep(0.18, 1.0, r2);
        if (caw > 1e-5) {
          vec2 off = (uv - 0.5) * caw;
          col.r = texture2D(inputBuffer, uv + off).r;
          col.b = texture2D(inputBuffer, uv - off).b;
        }
        if (uRadial > 0.002) {
          vec2 dc = uv - uRadialCenter; float w = uRadial * 0.05 * smoothstep(0.0, 0.25, dot(dc, dc));
          vec3 acc = col;
          for (int i = 1; i <= 6; i++) { acc += texture2D(inputBuffer, uv - dc * w * float(i)).rgb; }
          col = acc / 7.0;
        }
        float edge = smoothstep(0.10, 0.62, r2);
        float pulse = 0.72 + 0.28 * sin(uTime * 8.5);
        vec3 blood = vec3(0.42, 0.015, 0.0);
        col = mix(col, blood * (0.4 + edge * 1.2), clamp(uDamage * edge * pulse, 0.0, 0.85));
        col += uFlashColor * uFlash;
        outputColor = vec4(col, inputColor.a);
      }`, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, THREE.Uniform>([
        ['uCA', new THREE.Uniform(0.004)], ['uRadial', new THREE.Uniform(0)], ['uRadialCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uFlashColor', new THREE.Uniform(new THREE.Color(1, 1, 1))], ['uFlash', new THREE.Uniform(0)], ['uDamage', new THREE.Uniform(0)], ['uTime', new THREE.Uniform(0)],
      ]),
    });
  }
  u(name: string) { return this.uniforms.get(name)!; }
}

/**
 * Post-tonemap LDR colour grade, done in sRGB-ish space like a DaVinci node:
 * lift / gamma / gain, split toning (cool shadows, warm highlights), filmic S-curve, saturation, coloured vignette, low-health desaturation.
 */
export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', /* glsl */ `
      uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain; uniform float uSaturation; uniform float uContrast; uniform float uSCurve;
      uniform vec3 uShadowTint; uniform vec3 uHighlightTint; uniform float uSplit; uniform float uVigOffset; uniform float uVigDarkness; uniform vec3 uVigColor;
      uniform float uLowHealth; uniform float uTime; uniform float uCinematic;
      vec3 toS(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
      vec3 toL(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = toS(clamp(inputColor.rgb, 0.0, 1.0));
        // lift / gamma / gain
        c = pow(max(c * uGain + uLift * (1.0 - c), 0.0), 1.0 / uGamma);
        // split toning (multiplicative so blacks stay black and whites stay clean)
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float sw = 1.0 - smoothstep(0.0, 0.6, l);
        float hw = smoothstep(0.4, 1.0, l);
        c = mix(c, c * uShadowTint, sw * uSplit);
        c = mix(c, c * uHighlightTint, hw * uSplit);
        // contrast (pivot at 0.42) + soft filmic S-curve
        c = mix(vec3(0.42), c, uContrast);
        c = mix(c, c * c * (3.0 - 2.0 * c), uSCurve);
        c = clamp(c, 0.0, 1.0);
        // saturation (with a little vibrance: less boost on already-saturated pixels)
        l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float maxc = max(c.r, max(c.g, c.b)), minc = min(c.r, min(c.g, c.b));
        float sat = maxc - minc;
        float s = 1.0 + (uSaturation - 1.0) * (1.0 - sat * 0.5);
        c = mix(vec3(l), c, s);
        // low health: desaturate + darken pulse
        float lh = uLowHealth;
        if (lh > 0.001) {
          float pulse = 0.5 + 0.5 * sin(uTime * 5.0);
          c = mix(c, vec3(l) * 0.9, lh * (0.55 + 0.2 * pulse));
        }
        // vignette (elliptical, tinted)
        vec2 d = (uv - 0.5) * vec2(1.0, 0.86 + uCinematic * 0.25); float r = length(d) * 1.7;
        float v = smoothstep(uVigOffset, uVigOffset + 0.9, r);
        float dark = uVigDarkness + uCinematic * 0.18 + lh * 0.35;
        c = mix(c, uVigColor * l, clamp(v * dark, 0.0, 1.0));
        outputColor = vec4(toL(c), inputColor.a);
      }`, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, THREE.Uniform>([
        ['uLift', new THREE.Uniform(new THREE.Vector3(0.0, 0.004, 0.012))],
        ['uGamma', new THREE.Uniform(new THREE.Vector3(1.0, 1.0, 1.0))],
        ['uGain', new THREE.Uniform(new THREE.Vector3(1.04, 1.0, 0.96))],
        ['uSaturation', new THREE.Uniform(1.12)], ['uContrast', new THREE.Uniform(1.08)], ['uSCurve', new THREE.Uniform(0.22)],
        ['uShadowTint', new THREE.Uniform(new THREE.Vector3(0.86, 0.95, 1.12))], ['uHighlightTint', new THREE.Uniform(new THREE.Vector3(1.08, 1.0, 0.9))], ['uSplit', new THREE.Uniform(0.55)],
        ['uVigOffset', new THREE.Uniform(0.55)], ['uVigDarkness', new THREE.Uniform(0.5)], ['uVigColor', new THREE.Uniform(new THREE.Vector3(0.05, 0.06, 0.1))],
        ['uLowHealth', new THREE.Uniform(0)], ['uTime', new THREE.Uniform(0)], ['uCinematic', new THREE.Uniform(0)],
      ]),
    });
  }
  u(name: string) { return this.uniforms.get(name)!; }
}

/** Animated film grain, stronger in shadows, applied after SMAA. */
export class FilmGrainEffect extends Effect {
  constructor(amount = 0.045) {
    super('FilmGrainEffect', /* glsl */ `
      uniform float uAmount; uniform float uTime;
      float gr_hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 p = uv * resolution + vec2(fract(uTime * 13.7) * 811.0, fract(uTime * 7.3) * 577.0);
        float g = gr_hash(p) + gr_hash(p + 17.0) - 1.0; // triangular noise
        // grain is perceptual: apply in gamma space so shadows don't explode
        vec3 c = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2)); float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float w = uAmount * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.8, l)));
        c += g * w;
        outputColor = vec4(pow(max(c, 0.0), vec3(2.2)), inputColor.a);
      }`, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, THREE.Uniform>([['uAmount', new THREE.Uniform(amount)], ['uTime', new THREE.Uniform(0)]]),
    });
  }
  u(name: string) { return this.uniforms.get(name)!; }
}
