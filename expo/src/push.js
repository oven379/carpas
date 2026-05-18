import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { pushSettings, registerDetailingPushToken, registerOwnerPushToken } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

function easProjectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    ''
  )
}

export async function registerPushForSession(session) {
  if (!Device.isDevice && Platform.OS !== 'android') return { ok: false, reason: 'device_required' }

  const ownerToken = String(session?.ownerToken || '').trim()
  const detailingToken = String(session?.detailingToken || '').trim()
  if (!ownerToken && !detailingToken) return { ok: false, reason: 'auth_required' }

  const settings = await pushSettings().catch(() => null)
  if (settings?.enabled === false) return { ok: false, reason: 'disabled' }
  if (ownerToken && settings?.owners_enabled === false) return { ok: false, reason: 'owners_disabled' }
  if (detailingToken && settings?.detailings_enabled === false) return { ok: false, reason: 'detailings_disabled' }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Основные уведомления',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C7A45D',
    }).catch(() => {})
  }

  let permissions = await Notifications.getPermissionsAsync()
  if (permissions.status !== 'granted') {
    permissions = await Notifications.requestPermissionsAsync()
  }
  if (permissions.status !== 'granted') return { ok: false, reason: 'permission_denied' }

  const projectId = easProjectId()
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  const expoPushToken = tokenResult.data
  if (!expoPushToken) return { ok: false, reason: 'empty_token' }

  if (ownerToken) {
    await registerOwnerPushToken(ownerToken, expoPushToken)
  } else {
    await registerDetailingPushToken(detailingToken, expoPushToken)
  }

  return { ok: true, token: expoPushToken }
}
