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
    console.error('[КарПас]', err, info?.componentStack)
  }

  render() {
    if (this.state.err) {
      const msg = String(this.state.err?.message || this.state.err || 'Неизвестная ошибка')
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
          <p className="muted" style={{ marginBottom: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg}
          </p>
          <p className="muted small" style={{ marginBottom: 20 }}>
            Откройте консоль браузера (F12 → Console) для подробностей. Частая причина — повреждённые данные в хранилище;
            на экране входа можно сбросить локальные данные или обновите страницу.
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
