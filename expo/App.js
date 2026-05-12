import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import { useCallback, useRef } from 'react'
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { registerPushForSession } from './src/push'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://carpasss.ru/auth/owner'
const STORAGE_PREFIX = 'cp.mvp.v1.'
const APP_BOOT_VERSION = '2026-05-12-garage-v2'

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

const NATIVE_BOOTSTRAP_JS = `
  window.__CARPAS_NATIVE_APP__ = true;
  true;
`

const SESSION_BRIDGE_JS = `
  (function () {
    function sendSession() {
      try {
        function stored(key) {
          return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
        }
        var payload = {
          type: 'carpas-session',
          ownerToken: stored('${STORAGE_PREFIX}auth.ownerToken'),
          detailingToken: stored('${STORAGE_PREFIX}auth.detailingToken')
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
  const lastSessionKey = useRef('')

  const onMessage = useCallback((event) => {
    let data = null
    try {
      data = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    if (!data || data.type !== 'carpas-session') return

    const ownerToken = String(data.ownerToken || '')
    const detailingToken = String(data.detailingToken || '')
    const key = `${ownerToken}:${detailingToken}`
    if (!ownerToken && !detailingToken) return
    if (lastSessionKey.current === key) return
    lastSessionKey.current = key

    registerPushForSession({ ownerToken, detailingToken }).catch(() => {})
  }, [])

  return (
    <SafeAreaView style={styles.root}>
      <ExpoStatusBar style="light" backgroundColor="#0B0B0B" translucent={false} />
      <WebView
        source={{
          uri: initialWebUrl(),
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }}
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        injectedJavaScriptBeforeContentLoaded={NATIVE_BOOTSTRAP_JS}
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
})
