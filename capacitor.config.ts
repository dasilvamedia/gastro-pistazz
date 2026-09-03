import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.pistazz.gastro',
  appName: 'Pistazz',
  webDir: 'out',
  server: {
    // Direkt bei /home starten statt bei der Landingpage (die ist fuer
    // Unternehmen/Web gedacht) - verhindert das kurze Aufblitzen der
    // Landingpage beim App-Start, weil "/" gar nicht erst geladen wird.
    url: 'https://gastro.pistazz.io/home',
    cleartext: false,
    // Ohne diese Liste leitet Capacitor jede Navigation zu einer fremden
    // Domain (Google-/Apple-Login, Supabase-Auth-Redirect) an den externen
    // Safari/Chrome weiter statt im App-Webview zu bleiben - von dort kommt
    // man nach dem Login nicht mehr zurueck in die App.
    allowNavigation: [
      'drvhdrhyjbyjilaxuxjy.supabase.co',
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
      '*.apple.com',
    ],
  },
  plugins: {
    // Push im Vordergrund auch als Banner zeigen (APNs, Build 20+)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    // 'never' statt 'automatic': WKWebView darf keinen eigenen Safe-Area-
    // Abstand einfuegen, sonst entsteht zusaetzlich zu unserem CSS-Padding
    // (env(safe-area-inset-bottom)) eine zweite, unstyled graue Luecke
    // unterhalb der BottomNav.
    contentInset: 'never',
    backgroundColor: '#F5F5F0',
  },
  android: {
    backgroundColor: '#F5F5F0',
    // Push braucht auf Android Firebase (google-services.json). Bis das
    // eingerichtet ist, bleibt das Plugin dort aussen vor, sonst bricht Gradle.
    includePlugins: ['@capacitor/app'],
  },
};

export default config;
