import { useEffect, useRef, useState } from 'react'
import { fetchDadataCitySuggestions, getDadataSuggestToken } from '../lib/dadataCitySuggest.js'
import { ComboBox } from './ComboBox.jsx'

/**
 * Выбор города: подсказки DaData (VITE_DADATA_TOKEN), город можно набрать вручную.
 * Плейсхолдер по умолчанию — «Выберите город».
 */
export function CityComboBox({
  value,
  onChange,
  placeholder = 'Выберите город',
  disabled,
  onBlur,
  emptyText,
  maxItems = 24,
}) {
  const [remote, setRemote] = useState([])
  /** Строка запроса к DaData для последнего успешного ответа — чтобы ComboBox не отфильтровал синонимы (питер → Санкт-Петербург). */
  const [remoteMatchQuery, setRemoteMatchQuery] = useState('')
  const reqId = useRef(0)
  /** Нельзя мемоизировать с [] — после добавления VITE_DADATA_TOKEN в .env без перезапуска dev подсказки молчали. */
  const tokenOk = Boolean(getDadataSuggestToken())

  useEffect(() => {
    if (!tokenOk) {
      setRemote([])
      setRemoteMatchQuery('')
      return
    }
    const q = String(value ?? '').trim()
    if (q.length < 2) {
      setRemote([])
      setRemoteMatchQuery('')
      return
    }

    /* Иначе ComboBox фильтрует старый список по новому вводу и до ответа DaData список пустой. */
    setRemote([])
    setRemoteMatchQuery('')

    const id = ++reqId.current
    const ac = new AbortController()
    const t = window.setTimeout(() => {
      fetchDadataCitySuggestions(q, { signal: ac.signal })
        .then((list) => {
          if (reqId.current !== id) return
          setRemote(list)
          setRemoteMatchQuery(q)
        })
        .catch(() => {
          if (reqId.current !== id) return
          setRemote([])
          setRemoteMatchQuery('')
        })
    }, 300)

    return () => {
      window.clearTimeout(t)
      ac.abort()
    }
  }, [value, tokenOk])

  return (
    <ComboBox
      value={value}
      onChange={onChange}
      options={remote}
      optionsMatchQuery={remoteMatchQuery}
      placeholder={placeholder}
      disabled={disabled}
      onBlur={onBlur}
      emptyText={emptyText}
      maxItems={maxItems}
    />
  )
}
