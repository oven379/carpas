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
      infoPlist: {
        NSCameraUsageDescription: 'КарПас использует камеру, чтобы вы могли добавить фото автомобиля, документов или профиля.',
        NSPhotoLibraryUsageDescription: 'КарПас использует доступ к фото, чтобы вы могли выбрать изображения для автомобиля, документов или профиля.',
        NSPhotoLibraryAddUsageDescription: 'КарПас может сохранять выбранные изображения в медиатеку, если вы разрешите это в системе.',
        NSFaceIDUsageDescription: 'КарПас использует Face ID, чтобы быстро и безопасно открыть сохранённый вход.',
      },
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
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'КарПас использует Face ID, чтобы быстро и безопасно открыть сохранённый вход.',
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
