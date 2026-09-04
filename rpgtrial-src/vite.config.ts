import { defineConfig } from 'vite';
// Deployed as a subfolder of https://haoming-chen2006.github.io/rpgtrial/
export default defineConfig({
  base: process.env.RPG_BASE ?? '/rpgtrial/',
  server: { port: 5180, strictPort: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500, assetsInlineLimit: 0 },
  assetsInclude: ['**/*.hdr', '**/*.glb', '**/*.gltf', '**/*.bin'],
});
