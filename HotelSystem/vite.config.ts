import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Đọc network.local.env để lấy IP LAN phục vụ QR/mobile
 */
function parseNetworkLocalEnv(rootDir: string): Record<string, string> {
  const file = path.join(rootDir, 'network.local.env')
  const out: Record<string, string> = {}

  if (!fs.existsSync(file)) return out

  const text = fs.readFileSync(file, 'utf8')

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')

    if (eq <= 0) continue

    const key = trimmed.slice(0, eq).trim()

    let val = trimmed.slice(eq + 1).trim()

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    out[key] = val
    process.env[key] = val
  }

  return out
}

const networkLocalEnv = parseNetworkLocalEnv(__dirname)

const isDocker = process.env.VITE_DOCKER === 'true'

const authTarget = isDocker
  ? 'http://auth-service:8081'
  : 'http://127.0.0.1:8081'

const userTarget = isDocker
  ? 'http://user-service:8082'
  : 'http://127.0.0.1:8082'

const roomTarget = isDocker
  ? 'http://room-service:8083'
  : 'http://127.0.0.1:8083'

const bookingTarget = isDocker
  ? 'http://booking-service:8084'
  : 'http://127.0.0.1:8084'

const paymentTarget = isDocker
  ? 'http://payment-service:8085'
  : 'http://127.0.0.1:8085'

const notificationTarget = isDocker
  ? 'http://notification-service:8086'
  : 'http://127.0.0.1:8086'

const aiTarget = isDocker
  ? 'http://ai-service:8087'
  : 'http://127.0.0.1:8087'

const proxyTimeoutMs =
  Number(process.env.VITE_PROXY_TIMEOUT_MS) || 15000

export default defineConfig(({ mode }) => {
  const fromDotEnv = loadEnv(mode, __dirname, '')

  const publicAppOrigin =
    (networkLocalEnv.VITE_PUBLIC_APP_ORIGIN || '').trim() ||
    (fromDotEnv.VITE_PUBLIC_APP_ORIGIN || '').trim() ||
    'http://127.0.0.1:3000'

  const publicAppUrl = new URL(publicAppOrigin)
  const isHttps = publicAppUrl.protocol === 'https:'

  return {
    plugins: [react()],

    define: {
      'import.meta.env.VITE_PUBLIC_APP_ORIGIN':
        JSON.stringify(publicAppOrigin),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: Number(process.env.VITE_PORT) || 3000,
      strictPort: true,

      origin: publicAppOrigin,

      allowedHosts: true,

      hmr: isDocker
        ? {
            protocol: isHttps ? 'wss' : 'ws',
            host: publicAppUrl.hostname || '127.0.0.1',
            port: publicAppUrl.port ? Number(publicAppUrl.port) : 3000,
            clientPort: publicAppUrl.port ? Number(publicAppUrl.port) : 3000,
          }
        : {
            protocol: 'ws',
            host: '127.0.0.1',
            port: 3000,
            clientPort: 3000,
          },

      proxy: {
        '/auth-api': {
          target: authTarget,
          changeOrigin: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/auth-api/, ''),
        },

        '/user-api': {
          target: userTarget,
          changeOrigin: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/user-api/, ''),
        },

        '/room-api': {
          target: roomTarget,
          changeOrigin: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/room-api/, ''),
        },

        '/booking-api': {
          target: bookingTarget,
          changeOrigin: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/booking-api/, ''),
        },

        '/payment-api': {
          target: paymentTarget,
          changeOrigin: true,
          ws: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/payment-api/, ''),
        },

        '/notification-api': {
          target: notificationTarget,
          changeOrigin: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/notification-api/, ''),
        },

        '/ai-api': {
          target: aiTarget,
          changeOrigin: true,
          ws: true,
          timeout: proxyTimeoutMs,
          proxyTimeout: proxyTimeoutMs,
          rewrite: (path) =>
            path.replace(/^\/ai-api/, ''),
        },
      },
    },
  }
})
