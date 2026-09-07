import { defineConfig } from 'vite';
export default defineConfig({
  // Deployed as a project site at https://haoming-chen2006.github.io/pebblebrook/
  base: process.env.PEBBLEBROOK_BASE ?? '/pebblebrook/',
  server: { port: 5190, strictPort: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
