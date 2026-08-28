import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookmebusiness.customerapp1',
  appName: 'BookMe Customer',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  ios: {
    // Capacitor 8: content renders edge-to-edge under the status bar.
    // Use env(safe-area-inset-top) in CSS to push content below the status bar.
    contentInset: 'always',
    // Must stay true: most pages (HomePage, BookingsPage, etc.) rely on normal
    // document-level vertical scroll (min-h-screen, no inner overflow container).
    // Capacitor's WKWebView bridge already hard-disables rubber-band bounce
    // regardless of this flag, so this does NOT bring back the bounce/gap bug —
    // it only restores the ability to scroll long pages at all. Horizontal
    // drift/panning is locked out separately via CSS (overflow-x + touch-action).
    scrollEnabled: true,
    // Capacitor 8: SPM is now the default for new iOS projects.
    // This project uses CocoaPods (existing setup); keep it working with CocoaPods.
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
  },
    // StatusBar plugin controls the iOS status bar appearance.
    // Capacitor 8 introduced SystemBars for Android; iOS still uses StatusBar.
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
  },
    Assets: {
      inputPath: 'assets/logo.jpg'
  }
  }
  };

export default config;
