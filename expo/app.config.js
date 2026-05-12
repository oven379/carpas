const APP_VERSION = '1.0.3'
const ANDROID_VERSION_CODE = 2

module.exports = {
  expo: {
    name: 'КарПас',
    slug: 'carpas',
    scheme: 'carpas',
    version: APP_VERSION,
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0B0B0B',
    },
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],
    runtimeVersion: APP_VERSION,
    ios: {
      bundleIdentifier: 'ru.carpassport.app',
      buildNumber: APP_VERSION,
      supportsTablet: false,
    },
    android: {
      package: 'ru.carpassport.app',
      versionCode: ANDROID_VERSION_CODE,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0B0B0B',
      },
      permissions: ['POST_NOTIFICATIONS'],
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
    },
    plugins: [
      [
        'expo-notifications',
        {
          color: '#C7A45D',
          defaultChannel: 'default',
        },
      ],
      'expo-asset',
    ],
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '',
      },
    },
  },
}
