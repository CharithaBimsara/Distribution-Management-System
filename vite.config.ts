import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://largest-leena-nonlustrously.ngrok-free.dev',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'https://largest-leena-nonlustrously.ngrok-free.dev',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
