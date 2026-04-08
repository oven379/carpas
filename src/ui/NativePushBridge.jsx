import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getApi } from '../api/index.js'
import {
  getDetailingToken,
  getOwnerToken,
  hasDetailingSession,
  hasOwnerSession,
  subscribeSessionRefresh,
} from './auth.js'

function platformForPush() {
  const p = Capacitor.getPlatform()
  if (p === 'ios') return 'ios'
  if (p === 'android') return 'android'
  return 'web'
}

/**
 * Нативные приложения: запрос разрешения, регистрация FCM/APNs, отправка токена на API.
 * На вебе не выполняется. После входа владельца/партнёра токен пересылается при смене сессии.
 */
export default function NativePushBridge() {
  const lastTokenRef = useRef('')

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined

    const sendToken = async (token) => {
      const t = String(token || '').trim()
      if (!t) return
      lastTokenRef.current = t
      const platform = platformForPush()
      try {
        const api = getApi()
        if (hasOwnerSession() && getOwnerToken()) {
          await api.registerOwnerDevicePush({ token: t, platform })
        } else if (hasDetailingSession() && getDetailingToken()) {
          await api.registerDetailingDevicePush({ token: t, platform })
        }
      } catch {
        /* сеть / 401 — повторим после следующего bumpSessionRefresh */
      }
    }

    const unsubSession = subscribeSessionRefresh(() => {
      if (lastTokenRef.current) void sendToken(lastTokenRef.current)
    })

    let regListener
    let errListener

    const run = async () => {
      try {
        let perm = await PushNotifications.checkPermissions()
        if (perm.receive !== 'granted') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') return

        regListener = await PushNotifications.addListener('registration', (ev) => {
          void sendToken(ev.value)
        })
        errListener = await PushNotifications.addListener('registrationError', () => {})

        await PushNotifications.register()
      } catch {
        /* плагин недоступен или отказ в разрешении */
      }
    }

    void run()

    return () => {
      unsubSession()
      regListener?.remove?.()
      errListener?.remove?.()
    }
  }, [])

  return null
}
