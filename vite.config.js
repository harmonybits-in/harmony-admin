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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        // Offline fallback — any navigation request that fails → serve offline.html
        navigateFallback: null,
        offlineGoogleAnalytics: false,
        runtimeCaching: [
          {
            // API GET calls — NetworkFirst, 5s timeout, 5 min cache
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/v1') && !url.pathname.includes('webhook'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 150, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static assets (icons, fonts) — CacheFirst, 30 days
            urlPattern: /\.(png|jpg|jpeg|svg|ico|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Harmony Admin',
        short_name: 'Harmony',
        description: 'Harmony Restaurant OS — Owner & Manager Dashboard',
        theme_color: '#863bff',
        background_color: '#863bff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icon-192.png',          sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png',          sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png',  sizes: '180x180', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            url: '/',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Bills',
            short_name: 'Bills',
            url: '/bills',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Kitchen Display',
            short_name: 'Kitchen',
            url: '/kitchen',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
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
