import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/wiki-guess/',
  build: {
    outDir: '../wiki-guess',
    emptyOutDir: true,
  },
});
