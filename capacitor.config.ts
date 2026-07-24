import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Live server URL for the Android shell.
 * - Emulator → host machine: http://10.0.2.2:3000
 * - Real phone on LAN: http://YOUR_PC_LAN_IP:3000
 * - Production demo: https://your-deployed-site.example
 */
const serverUrl = (process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000').replace(/\/$/, '')

const config: CapacitorConfig = {
  appId: 'com.liparta.accountant',
  appName: 'Liparta حسابداری',
  webDir: 'capacitor-www',
  server: {
    url: `${serverUrl}/login?redirect=${encodeURIComponent('/accountant-app')}`,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: ['*'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#161b26',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#161b26',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#161b26',
  },
}

export default config
