import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'offline.html',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'SashaCrush',
        short_name: 'SashaCrush',
        description:
          'Production workspace for cross-border land transactions, payments, documents, and deal-room collaboration.',
        theme_color: '#0f5c32',
        background_color: '#eef1ef',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell + route chunks only — keep Uganda 3G installs lean.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        globIgnores: [
          '**/wallet-*.js',
          '**/charts-*.js',
          '**/maps-*.js',
          '**/workbox-*.js',
        ],
        maximumFileSizeToCacheInBytes: 1.5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/offline\.html$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/offline.html',
            handler: 'CacheFirst',
            options: {
              cacheName: 'offline-fallback',
            },
          },
          {
            // Heavy feature chunks: cache after first visit, not on install.
            urlPattern: ({ url }) =>
              /\/assets\/(wallet|charts|maps)-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'heavy-features',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Signed photo/document URLs + tile CDN — prefer cache when briefly offline.
            urlPattern: ({ request, url }) =>
              request.destination === 'image' ||
              url.hostname.includes('supabase') ||
              url.hostname.includes('tile.openstreetmap.org'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'runtime-media',
              expiration: {
                maxEntries: 96,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Allow Vitest to import Deno edge-function shared modules
      'npm:@supabase/supabase-js@2': '@supabase/supabase-js',
      'npm:pdf-lib@1.17.1': 'pdf-lib',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps'
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts'
          }
          if (
            id.includes('ethers') ||
            id.includes('@walletconnect') ||
            id.includes('@safe-global') ||
            id.includes('@reown')
          ) {
            return 'wallet'
          }
          if (id.includes('@supabase') || id.includes('@tanstack')) {
            return 'data'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
