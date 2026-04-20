import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

const isDocker = process.env.VITE_DOCKER === 'true'
const authTarget = isDocker ? 'http://auth-service:8081' : 'http://localhost:8081'
const userTarget = isDocker ? 'http://user-service:8082' : 'http://localhost:8082'
const roomTarget = isDocker ? 'http://room-service:8083' : 'http://localhost:8083'
const bookingTarget = isDocker ? 'http://booking-service:8084' : 'http://localhost:8084'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    proxy: {
      '/auth-api': {
        target: authTarget,
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/auth-api/, ''),
      },
      '/user-api': {
        target: userTarget,
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/user-api/, ''),
      },
      '/room-api': {
        target: roomTarget,
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/room-api/, ''),
      },
      '/booking-api': {
        target: bookingTarget,
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/booking-api/, ''),
      },
    },
  }
})