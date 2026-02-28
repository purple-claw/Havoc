import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config because webpack is so 2019
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Proxy API calls to backend during development
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // Don't rewrite the path — backend expects /api
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
