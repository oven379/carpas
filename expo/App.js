import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { registerPushForSession } from './src/push'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://carpasss.ru/auth/owner'
const STORAGE_PREFIX = 'cp.mvp.v1.'
const APP_BOOT_VERSION = [
  Constants.nativeAppVersion || Constants.expoConfig?.version || '1.0.3',
  Constants.nativeBuildVersion ||
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    'dev',
].join('-')
const SESSION_STORE_KEY = 'carpas-native-session-v1'

function initialWebUrl() {
  try {
    const url = new URL(WEB_URL)
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/auth/owner'
    }
    url.searchParams.set('native', '1')
    url.searchParams.set('appBoot', APP_BOOT_VERSION)
    return url.toString()
  } catch {
    return WEB_URL
  }
}

async function readNativeSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.appBootVersion !== APP_BOOT_VERSION) {
      await SecureStore.deleteItemAsync(SESSION_STORE_KEY)
      return null
    }
    const canUseBiometrics =
      (await LocalAuthentication.hasHardwareAsync().catch(() => false)) &&
      (await LocalAuthentication.isEnrolledAsync().catch(() => false))
    if (canUseBiometrics) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Войти в КарПас',
        cancelLabel: 'Ввести пароль',
        fallbackLabel: 'Код устройства',
        disableDeviceFallback: false,
      }).catch(() => ({ success: false }))
      if (!result?.success) return null
    }
    return parsed
  } catch {
    return null
  }
}

async function writeNativeSession(session) {
  try {
    await SecureStore.setItemAsync(
      SESSION_STORE_KEY,
      JSON.stringify({ ...session, appBootVersion: APP_BOOT_VERSION }),
    )
  } catch {
    // ignore
  }
}

async function clearNativeSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_STORE_KEY)
  } catch {
    // ignore
  }
}

function nativeBootstrapJs(session) {
  const sessionJson = JSON.stringify(session || null).replace(/</g, '\\u003c')
  return `
    (function () {
      window.__CARPAS_NATIVE_APP__ = true;
      try {
        document.documentElement.setAttribute('data-native-app', '1');
        var meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'viewport');
          document.head && document.head.appendChild(meta);
        }
        meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      } catch (e) {}
      try {
        var session = ${sessionJson};
        var prefix = '${STORAGE_PREFIX}';
        function put(key, value) {
          if (value === undefined || value === null || value === '') return;
          localStorage.setItem(prefix + key, JSON.stringify(value));
          sessionStorage.setItem(prefix + key, JSON.stringify(value));
        }
        if (session && session.appBootVersion === '${APP_BOOT_VERSION}') {
          put('auth.owner', session.owner || null);
          put('auth.ownerToken', session.ownerToken || '');
          put('auth.detailingId', session.detailingId || '');
          put('auth.detailingToken', session.detailingToken || '');
        }
      } catch (e) {}
    })();
    true;
  `
}

const SESSION_BRIDGE_JS = `
  (function () {
    function readJson(key) {
      try {
        var raw = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }
    function sendSession() {
      try {
        var payload = {
          type: 'carpas-session',
          owner: readJson('${STORAGE_PREFIX}auth.owner'),
          ownerToken: readJson('${STORAGE_PREFIX}auth.ownerToken') || '',
          detailingId: readJson('${STORAGE_PREFIX}auth.detailingId') || '',
          detailingToken: readJson('${STORAGE_PREFIX}auth.detailingToken') || ''
        };
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } catch (e) {}
    }
    sendSession();
    setInterval(sendSession, 4000);
  })();
  true;
`

export default function App() {
  const pushRegisteredKey = useRef('')
  const webViewRef = useRef(null)
  const [nativeSession, setNativeSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    readNativeSession().then((session) => {
      if (cancelled) return
      setNativeSession(session)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!nativeSession?.ownerToken && !nativeSession?.detailingToken) return
    const ownerToken = String(nativeSession.ownerToken || '')
    const detailingToken = String(nativeSession.detailingToken || '')
    const key = `${ownerToken}:${detailingToken}`
    if (pushRegisteredKey.current === key) return
    registerPushForSession({ ownerToken, detailingToken })
      .then((res) => {
        if (res?.ok) pushRegisteredKey.current = key
      })
      .catch(() => {})
  }, [nativeSession])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      try {
        webViewRef.current?.injectJavaScript(`
          try { window.location.href = '/notifications'; } catch (e) {}
          true;
        `)
      } catch {
        // ignore
      }
    })
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      Notifications.getBadgeCountAsync()
        .then((count) => Notifications.setBadgeCountAsync(Math.max(1, Number(count || 0) + 1)))
        .catch(() => {})
    })
    return () => {
      sub.remove()
      receivedSub.remove()
    }
  }, [])

  const bootstrapJs = useMemo(() => nativeBootstrapJs(nativeSession), [nativeSession])

  const onMessage = useCallback((event) => {
    let data = null
    try {
      data = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    if (!data) return

    if (data.type === 'carpas-session-clear') {
      pushRegisteredKey.current = ''
      setNativeSession(null)
      clearNativeSession()
      Notifications.setBadgeCountAsync(0).catch(() => {})
      return
    }

    if (data.type === 'carpas-notification-badge') {
      Notifications.setBadgeCountAsync(Math.max(0, Number(data.count || 0))).catch(() => {})
      return
    }

    if (data.type !== 'carpas-session') return

    const ownerToken = String(data.ownerToken || '')
    const detailingToken = String(data.detailingToken || '')
    const key = `${ownerToken}:${detailingToken}`
    if (!ownerToken && !detailingToken) return
    const nextSession = {
      owner: data.owner || null,
      ownerToken,
      detailingId: String(data.detailingId || ''),
      detailingToken,
    }
    setNativeSession((prev) => {
      const prevKey = `${String(prev?.ownerToken || '')}:${String(prev?.detailingToken || '')}`
      return prevKey === key ? prev : nextSession
    })
    writeNativeSession(nextSession)

    if (pushRegisteredKey.current === key) return
    registerPushForSession({ ownerToken, detailingToken })
      .then((res) => {
        if (res?.ok) pushRegisteredKey.current = key
      })
      .catch(() => {})
  }, [])

  if (!ready) {
    return (
      <SafeAreaView style={styles.root}>
        <ExpoStatusBar style="light" backgroundColor="#0B0B0B" translucent={false} />
        <View style={styles.loader}>
          <ActivityIndicator color="#C7A45D" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <ExpoStatusBar style="light" backgroundColor="#0B0B0B" translucent={false} />
      <WebView
        ref={webViewRef}
        source={{
          uri: initialWebUrl(),
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }}
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        setBuiltInZoomControls={false}
        textZoom={100}
        scalesPageToFit={false}
        injectedJavaScriptBeforeContentLoaded={bootstrapJs}
        injectedJavaScript={SESSION_BRIDGE_JS}
        onMessage={onMessage}
        style={styles.webview}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0B0B0B',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0,
  },
  webview: {
    backgroundColor: '#0B0B0B',
    flex: 1,
  },
  loader: {
    alignItems: 'center',
    backgroundColor: '#0B0B0B',
    flex: 1,
    justifyContent: 'center',
  },
})
