import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages runs Jekyll over the repository, and Jekyll refuses to publish
 * any file whose name begins with an underscore — silently, with no build
 * error and no warning. Vite names a chunk after whatever it was split around,
 * and `wasmoon` imports node builtins that Vite externalises, which produced
 * `__vite-browser-external-<hash>.js`: a 119 KB chunk the engine's dynamic
 * import depends on, present in the commit, 404 on the live site.
 *
 * The symptom was not a missing file. It was the room falling back to the
 * recorded fixture stream and then crashing on the first card it tried to
 * draw, on the live site only, minutes after the same build passed locally.
 *
 * `verify-dist.mjs` fails the deploy if a leading-underscore file reappears.
 */
const publishable = (name: string) => name.replace(/^[_.]+/, '') || 'chunk';

export default defineConfig({
  plugins: [react()],
  base: '/freekill/',
  server: {
    /**
     * The hero designer's back end (`npm run designer`). It is a separate
     * process rather than a vite plugin because what it does is boot the real
     * Lua engine on a generated general and drive its trigger in a scripted
     * room -- a second of CPU and 1852 files per check, which has no business
     * inside the dev server that serves the game.
     */
    proxy: { '/api': { target: 'http://localhost:5175', changeOrigin: true } },
  },
  build: {
    outDir: '../freekill',
    emptyOutDir: true,
    // Top-level await: the spike's headless measuring entry blocks the load
    // event until the game is over. Every browser this project targets has it.
    target: 'esnext',
    rollupOptions: {
      // Two pages, one build. `designer.html` is the block panel and the agent
      // chat; it talks to localhost:5175 and is therefore only useful in dev,
      // but it ships because leaving it out of the build means it is never
      // type-checked or bundled by the thing that actually publishes.
      input: {
        main: resolve(__dirname, 'index.html'),
        designer: resolve(__dirname, 'designer.html'),
      },
      output: {
        chunkFileNames: (chunk) => `assets/${publishable(chunk.name)}-[hash].js`,
      },
    },
  },
});
