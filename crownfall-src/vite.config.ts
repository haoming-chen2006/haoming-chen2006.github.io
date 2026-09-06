import { defineConfig } from 'vite';
export default defineConfig({
  // Deployed as a project site at https://haoming-chen2006.github.io/crownfall/
  base: process.env.CROWNFALL_BASE ?? '/crownfall/',
  server: { port: 5173, strictPort: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  optimizeDeps: {
    include: [
      'three',
      'three/addons/postprocessing/EffectComposer.js',
      'three/addons/postprocessing/RenderPass.js',
      'three/addons/postprocessing/UnrealBloomPass.js',
      'three/addons/postprocessing/OutputPass.js',
      'three/addons/geometries/RoundedBoxGeometry.js',
    ],
  },
});
