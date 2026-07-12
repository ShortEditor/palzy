import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Palzy',
        short_name: 'Palzy',
        description: 'The social feed for your college crowd',
        theme_color: '#6c63ff',
        background_color: '#0a0a0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'cloudinary-image-cache', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    rolldownOptions: {
      output: {
        // Split heavy deps into separate cacheable chunks
        manualChunks(id) {
          // Firebase — split by service so unused ones stay cached longer
          if (id.includes('firebase/app') || id.includes('@firebase/app'))         return 'firebase-app'
          if (id.includes('firebase/auth') || id.includes('@firebase/auth'))       return 'firebase-auth'
          if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'firebase-firestore'
          if (id.includes('firebase/storage') || id.includes('@firebase/storage')) return 'firebase-storage'
          if (id.includes('@firebase'))                                             return 'firebase-misc'

          // React ecosystem
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router'))                            return 'vendor-react'

          // Utilities
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/react-hot-toast') ||
              id.includes('node_modules/@tanstack'))                               return 'vendor-utils'
        },
      },
    },
    // Raise warning threshold — 600kB post-split is expected for Firebase
    chunkSizeWarningLimit: 600,
  },
})
