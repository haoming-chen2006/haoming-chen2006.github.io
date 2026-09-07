import type { Season, WeatherKind } from '../core/types.ts';
import { daylightHours } from '../core/time.ts';
import { ctx2d, makeCanvas } from '../art/pixel.ts';
import { TILE, type View } from './common.ts';

/** A point light in tile coordinates. */
export interface Light { x: number; y: number; r: number; colour: string; intensity: number; flicker?: number }

export interface Ambient { alpha: number; colour: string; /** 0..1 how dark it is (drives lit windows, fireflies) */ night: number; tint?: { colour: string; alpha: number } }

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

/** How dark and what colour the world is at `hour` (fractional) for a season and weather. */
export function ambient(hour: number, season: Season, weather: WeatherKind, snowCover: boolean): Ambient {
  const { sunrise, sunset } = daylightHours(season);
  const NIGHT = 0.74;
  let night: number;
  if (hour >= sunrise + 0.8 && hour <= sunset - 0.9) night = 0;
  else if (hour > sunset - 0.9 && hour < sunset + 1.1) night = smooth((hour - (sunset - 0.9)) / 2.0);
  else if (hour > sunrise - 1.0 && hour < sunrise + 0.8) night = 1 - smooth((hour - (sunrise - 1.0)) / 1.8);
  else night = 1;
  let alpha = night * NIGHT;
  // dusk is warm, night is blue, dawn is pale
  const dusk = hour > sunset - 1.2 && hour < sunset + 0.6 ? 1 - Math.abs((hour - (sunset - 0.3)) / 0.9) : 0;
  const dawn = hour > sunrise - 0.6 && hour < sunrise + 1.2 ? 1 - Math.abs((hour - (sunrise + 0.3)) / 0.9) : 0;
  let colour = '#0a1030';
  let tint: Ambient['tint'] | undefined;
  if (dusk > 0) tint = { colour: '#ff8a3c', alpha: 0.22 * smooth(dusk) };
  if (dawn > 0) tint = { colour: '#ffc98a', alpha: 0.16 * smooth(dawn) };
  if (weather === 'storm') { alpha = Math.max(alpha, 0.34); colour = night > 0.5 ? '#080c22' : '#202838'; }
  else if (weather === 'rain') { alpha = Math.max(alpha, 0.16); colour = night > 0.5 ? '#0a1030' : '#283048'; }
  else if (weather === 'cloudy') { alpha = Math.max(alpha, 0.06); colour = night > 0.5 ? '#0a1030' : '#303848'; }
  else if (weather === 'fog') { tint = { colour: '#d8dee6', alpha: 0.18 }; }
  if (weather === 'snow' || snowCover) alpha *= 0.8; // snow brightens the night
  if (season === 'winter' && night > 0.5) colour = '#0c1638';
  return { alpha, colour, night, tint };
}

export class LightingFx {
  private canvas = makeCanvas(1, 1);
  quality: 'high' | 'low' = 'high';

  /** Draw the lighting pass: ambient darkness with light holes, then additive warm glows. */
  render(g: CanvasRenderingContext2D, view: View, amb: Ambient, lights: Light[]): void {
    if (amb.tint && amb.tint.alpha > 0.005) {
      g.globalAlpha = amb.tint.alpha; g.fillStyle = amb.tint.colour; g.fillRect(0, 0, view.W, view.H); g.globalAlpha = 1;
    }
    if (amb.alpha < 0.01) return;
    const lw = Math.ceil(view.W / view.scale), lh = Math.ceil(view.H / view.scale);
    if (this.canvas.width !== lw || this.canvas.height !== lh) { this.canvas.width = lw; this.canvas.height = lh; }
    const lg = ctx2d(this.canvas);
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, lw, lh);
    lg.globalAlpha = amb.alpha;
    lg.fillStyle = amb.colour;
    lg.fillRect(0, 0, lw, lh);
    lg.globalAlpha = 1;
    const useLights = this.quality === 'high' && lights.length > 0;
    if (useLights) {
      lg.globalCompositeOperation = 'destination-out';
      for (const l of lights) {
        const cx = (view.ox + l.x * TILE * view.scale) / view.scale, cy = (view.oy + l.y * TILE * view.scale) / view.scale;
        const r = l.r * TILE * (1 + (l.flicker ?? 0));
        if (cx + r < 0 || cy + r < 0 || cx - r > lw || cy - r > lh) continue;
        const grad = lg.createRadialGradient(cx, cy, 0, cx, cy, r);
        const a = Math.min(1, l.intensity) * Math.min(1, amb.alpha / 0.5);
        grad.addColorStop(0, `rgba(0,0,0,${a})`);
        grad.addColorStop(0.45, `rgba(0,0,0,${a * 0.6})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lg.fillStyle = grad;
        lg.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      lg.globalCompositeOperation = 'source-over';
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(this.canvas, 0, 0, lw, lh, 0, 0, lw * view.scale, lh * view.scale);
    if (!useLights) return;
    // warm glows
    g.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const cx = view.ox + l.x * TILE * view.scale, cy = view.oy + l.y * TILE * view.scale;
      const r = l.r * TILE * view.scale * 0.9 * (1 + (l.flicker ?? 0));
      if (cx + r < 0 || cy + r < 0 || cx - r > view.W || cy - r > view.H) continue;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = 0.2 * l.intensity * amb.night;
      grad.addColorStop(0, hexA(l.colour, a));
      grad.addColorStop(1, hexA(l.colour, 0));
      g.fillStyle = grad;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export const lerpN = lerp;
