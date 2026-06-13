import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/transpose': 'http://localhost:8000',
      '/capo': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/progress': 'http://localhost:8000',
    },
  },
})
