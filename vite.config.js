import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ── Fix: sockjs-client uses Node.js `global` — browser mein nahi hota
  define: {
    global: 'globalThis',
  },

  // ── Dev server proxy ─────────────────────────────────────────
  // Backend API calls → Spring Boot (localhost:8080)
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:2026',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ── Env variables ─────────────────────────────────────────────
  // VITE_ prefix wale variables browser mein accessible hain
  // import.meta.env.VITE_GOOGLE_MAPS_KEY
  envPrefix: 'VITE_',

  // ── Build output ──────────────────────────────────────────────
  build: {
    outDir: 'dist',
    sourcemap: false,   // production mein source map band — key leak na ho
  },
})
