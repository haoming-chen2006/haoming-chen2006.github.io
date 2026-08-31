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
  build: {
    outDir: '../freekill',
    emptyOutDir: true,
    // Top-level await: the spike's headless measuring entry blocks the load
    // event until the game is over. Every browser this project targets has it.
    target: 'esnext',
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) => `assets/${publishable(chunk.name)}-[hash].js`,
      },
    },
  },
});
