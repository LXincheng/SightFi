import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  envDir: '../../',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sightfi-mark.svg'],
      manifest: {
        name: 'SightFi',
        short_name: 'SightFi',
        description: 'AI Financial Monitoring App',
        theme_color: '#0e141f',
        background_color: '#f4f7fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/sightfi-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/sightfi-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-simple-maps') || id.includes('world-atlas')) return 'vendor-map'
          if (id.includes('recharts') || id.includes('echarts')) return 'vendor-charts'
          if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor-core'
        },
      },
    },
    chunkSizeWarningLimit: 650,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
