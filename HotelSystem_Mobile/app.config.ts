import type { ExpoConfig } from 'expo/config';
import fs from 'fs';
import path from 'path';

function parseNetworkLocalEnv(rootDir: string): Record<string, string> {
  const file = path.join(rootDir, 'network.local.env');
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const networkEnv = parseNetworkLocalEnv(__dirname);
const apiOrigin = (
  process.env.EXPO_PUBLIC_API_ORIGIN ||
  networkEnv.EXPO_PUBLIC_API_ORIGIN ||
  'http://192.168.1.6:3000'
)
  .trim()
  .replace(/\/$/, '');

const config: ExpoConfig = {
  name: 'HotelSystem_Mobile',
  slug: 'HotelSystem_Mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Cho phép camera để quét mã QR thanh toán check-in.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
  ],
  extra: {
    apiOrigin,
  },
};

export default config;
