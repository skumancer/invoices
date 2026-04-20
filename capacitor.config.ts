import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'online.sendinvoices.app',
  appName: 'Send Invoices',
  webDir: 'dist',
  server: process.env.CAPACITOR_SERVER_URL
    ? {
      url: process.env.CAPACITOR_SERVER_URL,
      cleartext: true,
    }
    : undefined,
  ios: {
    scrollEnabled: true,
    contentInset: 'automatic',
  },
  plugins: {
    App: {
      launchAutoHide: false,
    },
  },
}

export default config
