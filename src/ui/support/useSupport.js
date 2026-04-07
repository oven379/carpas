import { useContext } from 'react'
import { SupportContext } from './supportContext.js'

export function useSupport() {
  const ctx = useContext(SupportContext)
  if (!ctx) {
    throw new Error('useSupport: провайдер не найден')
  }
  return ctx
}
