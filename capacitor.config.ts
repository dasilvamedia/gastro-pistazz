import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.pistazz.gastro',
  appName: 'Pistazz',
  webDir: 'out',
  server: {
    url: 'https://gastro.pistazz.io',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F5F5F0',
  },
  android: {
    backgroundColor: '#F5F5F0',
  },
};

export default config;
