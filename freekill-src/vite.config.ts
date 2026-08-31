import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/freekill/',
  build: {
    outDir: '../freekill',
    emptyOutDir: true,
    // Top-level await: the spike's headless measuring entry blocks the load
    // event until the game is over. Every browser this project targets has it.
    target: 'esnext',
  },
});
