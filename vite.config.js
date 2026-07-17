import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Palzy',
        short_name: 'Palzy',
        description: 'The social feed built for your college crowd. Post, vibe, and connect with batchmates.',
        theme_color: '#a078ff',
        background_color: '#0d0d14',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['social', 'education'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Home Feed',
            short_name: 'Feed',
            description: 'Jump straight to your feed',
            url: '/',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Campus Board',
            short_name: 'Campus',
            description: 'View doubts, notes and trending posts',
            url: '/campus',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Explore',
            short_name: 'Explore',
            description: 'Search people and posts',
            url: '/explore',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-static', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'cloudinary-image-cache', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // Cache Firebase REST API calls with NetworkFirst for freshness
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'firebase-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    // Raise warning limit — Firebase + React is inherently large
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Manual chunk splitting for better long-term cache hits.
        // Each chunk gets a content hash so browsers re-download only what changed.
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Firebase: split each service so updating one doesn't bust other caches
          if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'firebase-firestore'
          if (id.includes('@firebase/auth')      || id.includes('firebase/auth'))      return 'firebase-auth'
          if (id.includes('@firebase/app')       || id.includes('firebase/app'))       return 'firebase-app'
          if (id.includes('firebase'))                                                  return 'firebase-core'

          // React runtime (almost never changes between deploys)
          if (id.includes('react-dom'))     return 'react-dom'
          if (id.includes('react-router'))  return 'react-router'
          if (id.includes('react'))         return 'react-core'

          // Utility libs
          if (id.includes('date-fns'))      return 'date-utils'
          if (id.includes('react-hot-toast')) return 'toast'
        },
      },
    },
  },
})
