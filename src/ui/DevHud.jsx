import { useEffect } from 'react'
import { isNativeApp } from '../lib/nativePlatform.js'

export default function DevHud() {
  useEffect(() => {
    if (!import.meta.env.DEV && !isNativeApp()) return
    import('eruda').then(({ default: eruda }) => {
      eruda.init()
    })
  }, [])

  return null
}
