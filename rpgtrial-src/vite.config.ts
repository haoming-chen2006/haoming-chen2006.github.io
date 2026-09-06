import { defineConfig } from 'vite';
// Deployed as a subfolder of https://haoming-chen2006.github.io/rpgtrial/
export default defineConfig({
  base: process.env.RPG_BASE ?? '/rpgtrial/',
  server: { port: 5180, strictPort: false, watch: { ignored: ['**/public/assets/**', '**/e2e/**', '**/NOTES-*.md'] } },
  preview: { port: 5181, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500, assetsInlineLimit: 0 },
  assetsInclude: ['**/*.hdr', '**/*.glb', '**/*.gltf', '**/*.bin'],
});
