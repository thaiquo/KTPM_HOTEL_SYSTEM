import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * IP LAN cho QR (điện thoại quét). Ưu tiên network.local.env; fallback .env (VITE_PUBLIC_APP_ORIGIN).
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
const authTarget = isDocker ? 'http://auth-service:8081' : 'http://localhost:8081'
const userTarget = isDocker ? 'http://user-service:8082' : 'http://localhost:8082'
const roomTarget = isDocker ? 'http://room-service:8083' : 'http://localhost:8083'
const bookingTarget = isDocker ? 'http://booking-service:8084' : 'http://localhost:8084'
const paymentTarget = isDocker ? 'http://payment-service:8085' : 'http://localhost:8085'
const notificationTarget = isDocker ? 'http://notification-service:8086' : 'http://localhost:8086'

export default defineConfig(({ mode }) => {
  const fromDotEnv = loadEnv(mode, __dirname, '')
  const publicAppOrigin =
    (networkLocalEnv.VITE_PUBLIC_APP_ORIGIN || '').trim() ||
    (fromDotEnv.VITE_PUBLIC_APP_ORIGIN || '').trim() ||
    ''

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PUBLIC_APP_ORIGIN': JSON.stringify(publicAppOrigin),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.VITE_PORT) || 3000,
      hmr: {
        host: 'localhost',
        clientPort: Number(process.env.VITE_PORT) || 3000,
      },
      proxy: {
        // Tất cả request bắt đầu bằng -api sẽ đi qua Gateway port 8080
        '^/.*-api': {
          target: isDocker ? 'http://api-gateway:8080' : 'http://localhost:8080',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
