import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/draft/',
  build: {
    outDir: '../draft',
    emptyOutDir: true,
  },
})
