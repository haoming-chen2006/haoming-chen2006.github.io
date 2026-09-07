/** Tiny pixel-art helpers shared by the generators (characters, crops, icons, emotes). */

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('art: 2d context unavailable');
  g.imageSmoothingEnabled = false;
  return g;
}

export interface Rgb { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(c: Rgb): string {
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + ((1 << 24) | (cl(c.r) << 16) | (cl(c.g) << 8) | cl(c.b)).toString(16).slice(1);
}

/** darken (amount < 0) or lighten (amount > 0) a hex colour; amount in -1..1 */
export function shade(hex: string, amount: number): string {
  const c = hexToRgb(hex);
  if (amount < 0) { const k = 1 + amount; return rgbToHex({ r: c.r * k, g: c.g * k, b: c.b * k }); }
  return rgbToHex({ r: c.r + (255 - c.r) * amount, g: c.g + (255 - c.g) * amount, b: c.b + (255 - c.b) * amount });
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Luminance 0..1 of a hex colour, for choosing contrasting outlines. */
export function luma(hex: string): number {
  const c = hexToRgb(hex);
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

/**
 * A pixel painter over a 2d context: every call fills whole pixels, no anti-aliasing. Coordinates are
 * source pixels; `dx/dy` offsets let one drawing routine be reused for animation frames.
 */
export class Painter {
  g: CanvasRenderingContext2D;
  dx = 0;
  dy = 0;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  px(x: number, y: number, color: string): void { this.g.fillStyle = color; this.g.fillRect(x + this.dx, y + this.dy, 1, 1); }
  rect(x: number, y: number, w: number, h: number, color: string): void { if (w <= 0 || h <= 0) return; this.g.fillStyle = color; this.g.fillRect(x + this.dx, y + this.dy, w, h); }
  hline(x0: number, x1: number, y: number, color: string): void { this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, color); }
  vline(x: number, y0: number, y1: number, color: string): void { this.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, color); }
  /** outline of a rectangle */
  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.hline(x, x + w - 1, y, color); this.hline(x, x + w - 1, y + h - 1, color);
    this.vline(x, y, y + h - 1, color); this.vline(x + w - 1, y, y + h - 1, color);
  }
  /** a filled rectangle with an outline and the four corner pixels knocked out (rounded look) */
  blob(x: number, y: number, w: number, h: number, fill: string, outline: string): void {
    this.rect(x + 1, y, w - 2, h, outline);
    this.rect(x, y + 1, w, h - 2, outline);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }
  /** filled disc (radius in px, centre at x,y) */
  disc(cx: number, cy: number, r: number, color: string): void {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) this.px(cx + x, cy + y, color);
  }
  /** draw a string picture: each char maps to a colour in `pal`, '.' is transparent */
  pic(x: number, y: number, rows: string[], pal: Record<string, string>): void {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c) this.px(x + i, y + j, c);
      }
    }
  }
}

/** Kenney-style dark outline. */
export const OUTLINE = '#2f2216';
