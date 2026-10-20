import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Wardrobe AI',
        short_name: 'WardrobeAI',
        description: 'Offline wardrobe outfit recommendation prototype',
        theme_color: '#111827',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
