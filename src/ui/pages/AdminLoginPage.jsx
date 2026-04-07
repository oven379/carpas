import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Seo } from '../../seo/Seo.jsx'
import Logo from '../Logo.jsx'
import { BRAND_TAGLINE } from '../../lib/brandConstants.js'
import { Button, Input } from '../components.jsx'
import { adminGateCredentialsOk } from '../../lib/adminGateCredentials.js'
import { hasAdminMockSession, setAdminMockSession } from '../../lib/adminMockSession.js'
import { getApi } from '../../api/index.js'
import { HttpError } from '../../api/http.js'
import { hasAdminApiToken, setAdminApiToken } from '../../lib/adminApiSession.js'

export default function AdminLoginPage() {
  const nav = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (hasAdminMockSession() || hasAdminApiToken()) nav('/admin/panel', { replace: true })
  }, [nav])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await getApi().adminSupportLogin({
        login: String(login || '').trim(),
        password: String(password || ''),
      })
      if (res?.ok && res?.token) {
        setAdminApiToken(res.token)
        setAdminMockSession()
        nav('/admin/panel', { replace: true })
        return
      }
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        const msg =
          err.body && typeof err.body === 'object' && typeof err.body.message === 'string'
            ? err.body.message
            : 'Неверный логин или пароль.'
        setError(msg)
        setBusy(false)
        return
      }
    }
    setBusy(false)
    if (adminGateCredentialsOk(login, password)) {
      setAdminMockSession()
      nav('/admin/panel', { replace: true })
      return
    }
    setError('Неверный логин или пароль.')
  }

  return (
    <div className="adminLoginPage">
      <Seo title="Вход · админ · КарПас" description="Служебная страница входа в панель администрирования." noindex />
      <div className="adminLoginPage__inner">
        <div className="adminLoginPage__logoWrap">
          <div className="adminLoginPage__logoFrame">
            <Logo size={44} />
          </div>
          <p className="adminLoginPage__brandTagline">{BRAND_TAGLINE}</p>
        </div>
        <p className="adminLoginPage__tagline">
          Ну что ты братик? Поможем людям быть счастливее?
        </p>
        <form className="adminLoginPage__form card pad" onSubmit={submit} autoComplete="off">
          <label className="field">
            <span className="field__label">Логин</span>
            <Input
              className="input"
              name="admin-login"
              value={login}
              onChange={(e) => {
                setLogin(e.target.value)
                setError('')
              }}
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span className="field__label">Пароль</span>
            <Input
              className="input"
              type="password"
              name="admin-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p className="adminLoginPage__error small" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="btn adminLoginPage__submit" variant="primary" disabled={busy}>
            {busy ? 'Проверка…' : 'ну заходи !'}
          </Button>
          <p className="muted small adminLoginPage__hint">
            При настроенном API используются учётные данные из{' '}
            <code className="adminMono">ADMIN_SUPPORT_*</code> на сервере; без API сохраняется локальный макет по тем же
            логину и паролю.
          </p>
        </form>
      </div>
    </div>
  )
}
