import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache API GET responses for 5 minutes (stale-while-revalidate)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1') && !url.pathname.includes('webhook'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: 'HarmoneyEats Admin',
        short_name: 'HarmoneyAdmin',
        description: 'Restaurant Management Dashboard',
        theme_color: '#e53e3e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],

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
