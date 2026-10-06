import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['https://candley-backend.onrender.com'],
    proxy: {
      '/api': {
        target: 'https://candley-backend.onrender.com',
        changeOrigin: true,
      },
    },
  },

  plugins: [react(), tailwindcss()],
})