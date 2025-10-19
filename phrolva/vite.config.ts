import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config because webpack is so 2019
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
