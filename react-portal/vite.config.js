import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'assets/*'],
      manifest: {
        name: 'CLS Employee Portal',
        short_name: 'CLS Portal',
        description: 'Carolina Lumpers Service Employee Portal',
        theme_color: '#FFBF00',
        background_color: '#0f0f0f',
        display: 'standalone',
        icons: [
          {
            src: '/assets/CLS-icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/CLS-icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cls-proxy\.s-garay\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 30 // 30 minutes
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
