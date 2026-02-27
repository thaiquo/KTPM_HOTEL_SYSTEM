import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/auth-api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/auth-api/, ''),
      },
      '/user-api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/user-api/, ''),
      },
      '/room-api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/room-api/, ''),
      },
    },
  }
})