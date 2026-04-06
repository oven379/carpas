import { Component } from 'react'

/**
 * Ловит необработанные ошибки рендера — вместо «пустого тёмного экрана» показываем текст и кнопку обновления.
 */
export default class RootErrorBoundary extends Component {
  state = { err: null }

  static getDerivedStateFromError(err) {
    return { err }
  }

  componentDidCatch(err, info) {
    if (import.meta.env.DEV) console.error('[КарПас]', err, info?.componentStack)
  }

  render() {
    if (this.state.err) {
      const raw = String(this.state.err?.message || this.state.err || '')
      const msg = import.meta.env.DEV
        ? raw || 'Неизвестная ошибка'
        : 'Произошла ошибка при отображении страницы.'
      return (
        <div
          className="rootErrorBoundary"
          style={{
            padding: '28px 20px',
            maxWidth: 560,
            margin: '0 auto',
            minHeight: '50vh',
            boxSizing: 'border-box',
          }}
        >
          <h1 className="h1" style={{ color: 'var(--text-h)', marginBottom: 12 }}>
            Не удалось отобразить страницу
          </h1>
          <p className="muted" style={{ marginBottom: 20, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg}
          </p>
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={() => {
              this.setState({ err: null })
              window.location.assign('/')
            }}
          >
            На главную
          </button>
          <button
            type="button"
            className="btn"
            data-variant="ghost"
            style={{ marginLeft: 10 }}
            onClick={() => window.location.reload()}
          >
            Обновить страницу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
