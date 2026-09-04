export type QualityTier = 'ultra' | 'high' | 'medium' | 'low' | 'test';
export interface QualitySettings {
  tier: QualityTier; pixelRatio: number; shadowMap: number; shadows: boolean; ao: boolean; bloom: boolean; dof: boolean;
  godRays: boolean; grassDensity: number; treeDetail: number; particles: number; smaa: boolean; volumetric: boolean; waterReflection: boolean;
}
export const QUALITY: Record<QualityTier, QualitySettings> = {
  ultra:  { tier: 'ultra',  pixelRatio: Math.min(devicePixelRatio, 2),   shadowMap: 4096, shadows: true, ao: true,  bloom: true, dof: true,  godRays: true,  grassDensity: 1.0,  treeDetail: 1.0, particles: 1.0, smaa: true, volumetric: true,  waterReflection: true },
  high:   { tier: 'high',   pixelRatio: Math.min(devicePixelRatio, 1.5), shadowMap: 2048, shadows: true, ao: true,  bloom: true, dof: true,  godRays: true,  grassDensity: 0.7,  treeDetail: 0.8, particles: 0.8, smaa: true, volumetric: true,  waterReflection: true },
  medium: { tier: 'medium', pixelRatio: 1,                                shadowMap: 2048, shadows: true, ao: false, bloom: true, dof: false, godRays: false, grassDensity: 0.4,  treeDetail: 0.6, particles: 0.5, smaa: true, volumetric: false, waterReflection: false },
  low:    { tier: 'low',    pixelRatio: 1,                                shadowMap: 1024, shadows: true, ao: false, bloom: false, dof: false, godRays: false, grassDensity: 0.15, treeDetail: 0.4, particles: 0.25, smaa: false, volumetric: false, waterReflection: false },
  // headless verification only (SwiftShader): minimal rendering so the sim can run near real time
  test:   { tier: 'test',   pixelRatio: 0.5,                              shadowMap: 256,  shadows: false, ao: false, bloom: false, dof: false, godRays: false, grassDensity: 0, treeDetail: 0.1, particles: 0.1, smaa: false, volumetric: false, waterReflection: false },
};
export function detectQuality(): QualityTier {
  try {
    const q = new URLSearchParams(location.search).get('quality') as QualityTier | null; if (q && QUALITY[q]) return q;
    if (new URLSearchParams(location.search).get('test') === '1') return 'test';
    const saved = localStorage.getItem('hm.quality') as QualityTier | null; if (saved && QUALITY[saved]) return saved;
    const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); if (!gl) return 'low';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info'); const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software/i.test(r)) return 'medium';
    if (/RTX 30|RTX 40|RTX 50|Radeon RX 7|Apple M[2-9] (Pro|Max|Ultra)/i.test(r)) return 'ultra';
    return 'high';
  } catch { return 'high'; }
}
