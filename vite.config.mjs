import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built index.html loads over file:// inside Electron.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5234, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
})
