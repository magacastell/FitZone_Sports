import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // El backend no tiene CORS: en desarrollo el front le habla via proxy (mismo origen).
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
