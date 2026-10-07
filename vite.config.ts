import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Used when VITE_API_BASE_URL is empty (same-origin requests). Defaults to a local backend,
      // never production, so development cannot modify live data by accident.
      proxy: {
        '/api': { target: env.DEV_API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
      },
    },
    plugins: [react(), tailwindcss()],
  }
})
