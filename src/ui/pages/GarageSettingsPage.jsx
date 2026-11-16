import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { AuthChangePasswordSection } from '../AuthChangePasswordSection.jsx'
import { Field, Card, CityComboBox, Input, PageLoadSpinner, PhoneRuInput } from '../components.jsx'
import { clearOwnerSession, hasOwnerSession, mergeSessionOwnerScalars } from '../auth.js'
import { useRepo, refreshAllClientData } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { formatPhoneRuInput } from '../../lib/format.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'
import { useAsyncActionLock } from '../useAsyncActionLock.js'

export default function GarageSettingsPage() {
  const navigate = useNavigate()
  const r = useRepo()
  const saveLock = useAsyncActionLock()
  const { owner, mode, loading } = useDetailing()
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    garageCity: '',
    garageAvatar: '',
  })

  useEffect(() => {
    if (!owner?.email) return
    setDraft({
      name: owner.name || '',
      phone: formatPhoneRuInput(owner.phone || ''),
      garageCity: owner.garageCity || '',
      garageAvatar: owner.garageAvatar || '',
    })
  }, [
    owner?.email,
    owner?.name,
    owner?.phone,
    owner?.garageCity,
    owner?.garageAvatar,
  ])

  /** Без сохранения: уходит с формы, черновик не пишется на сервер. */
  const cancelAndGoBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      const idx = window.history.state?.idx
      if (typeof idx === 'number' && idx > 0) {
        navigate(-1)
        return
      }
    }
    navigate('/garage', { replace: true })
  }, [navigate])

  const logoutAndGoAuth = useCallback(() => {
    clearOwnerSession()
    refreshAllClientData()
    navigate('/auth/owner', { replace: true })
  }, [navigate])

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />
  if (mode === 'owner' && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  const ownerEmail = String(owner?.email || '').trim()

  async function deleteAccount() {
    if (deleteBusy) return
    const first = window.confirm(
      'Удалить аккаунт КарПас? Будут удалены ваш профиль, личный гараж и данные входа. Это действие нельзя отменить.',
    )
    if (!first) return
    const typed = window.prompt('Для подтверждения введите УДАЛИТЬ')
    if (String(typed || '').trim().toUpperCase() !== 'УДАЛИТЬ') return

    setDeleteBusy(true)
    try {
      await r.deleteOwnerAccount()
      clearOwnerSession()
      refreshAllClientData()
      navigate('/auth/owner', { replace: true })
    } catch (e) {
      alert(formatHttpErrorMessage(e))
      if (e instanceof HttpError && e.status === 401) {
        clearOwnerSession()
        refreshAllClientData()
        navigate('/auth/owner', { replace: true })
      }
    } finally {
      setDeleteBusy(false)
    }
  }

  function saveProfile(event) {
    event.preventDefault()
    void saveLock.run(async () => {
      setSaveError('')
      const patch = {
        name: draft.name.trim(),
        phone: formatPhoneRuInput(draft.phone).trim(),
        garageCity: draft.garageCity.trim(),
      }
      if (draft.garageAvatar !== (owner?.garageAvatar || '')) {
        patch.garageAvatar = draft.garageAvatar
      }
      try {
        const res = await r.updateOwnerMe(patch)
        if (res?.owner) mergeSessionOwnerScalars(res.owner)
      } catch (e) {
        setSaveError(formatHttpErrorMessage(e))
        if (e instanceof HttpError && e.status === 401) {
          navigate('/auth/owner', { replace: true })
        }
        return
      }
      refreshAllClientData()
      navigate('/garage', { replace: true })
    })
  }

  return (
    <div className="container garageSettings">
      <header>
        <nav className="breadcrumbs" aria-label="Навигация по разделу">
          <Link to="/garage">Гараж</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Настройки кабинета</span>
        </nav>
        <h1 className="h1 garageSettings__title">Личный кабинет</h1>
      </header>

      <Card className="pad garageSettings__card">
        <form onSubmit={saveProfile} aria-labelledby="garage-settings-profile">
          <h2 className="h2 garageSettings__sectionTitle" id="garage-settings-profile">Профиль</h2>
          <fieldset className="garageSettings__profile" disabled={saveLock.pending}>
            <legend className="srOnly">Данные профиля</legend>
            <MediaBannerAvatarBlock
              variant="garage"
              showBannerColumn={false}
              showPhotoUploadHints={false}
              avatarEmptyHint="Загрузить фото"
              avatarUrl={draft.garageAvatar}
              onAvatarUrl={(url) => setDraft((d) => ({ ...d, garageAvatar: url }))}
              placeholderEmail={ownerEmail}
              placeholderFallback={String(draft.name || '').trim()}
            />
            <div className="garageSettings__fields">
              <Field label="Имя" insetLabel>
                <Input
                  className="input"
                  value={draft.name}
                  placeholder=""
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  autoComplete="name"
                />
              </Field>
              <Field label="Электронная почта" hint="Почту здесь изменить нельзя." insetLabel>
                <Input className="input" type="email" value={ownerEmail} readOnly autoComplete="email" />
              </Field>
              <Field label="Телефон" insetLabel>
                <PhoneRuInput
                  value={draft.phone}
                  placeholder="999 999 00 00"
                  onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(e.target.value) }))}
                  onBlur={() => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(d.phone) }))}
                />
              </Field>
              <Field label="Город" insetLabel>
                <CityComboBox
                  value={draft.garageCity}
                  placeholder="Город"
                  maxItems={20}
                  onChange={(v) => setDraft((d) => ({ ...d, garageCity: v }))}
                />
              </Field>
            </div>
          </fieldset>
          {saveError ? <p className="garageSettings__error" role="alert">{saveError}</p> : null}
          <div className="formActions garageSettings__profileActions">
            <button type="button" className="btn" data-variant="ghost" disabled={saveLock.pending} onClick={cancelAndGoBack}>
              Отменить
            </button>
            <button
              type="submit"
              className="btn"
              data-variant="primary"
              disabled={saveLock.pending}
              aria-busy={saveLock.pending || undefined}
            >
              {saveLock.pending ? 'Сохранение…' : 'Сохранить профиль'}
            </button>
          </div>
        </form>
      </Card>

      <Card className="pad garageSettings__card">
        <h2 className="h2 garageSettings__sectionTitle">Безопасность</h2>
        <details className="garageSettings__password">
          <summary>Сменить пароль</summary>
          <AuthChangePasswordSection
            variant="owner"
            r={r}
            showHeading={false}
            onPasswordChanged={() => {
              alert('Пароль обновлён. Войдите снова, указав почту и новый пароль.')
              logoutAndGoAuth()
            }}
          />
        </details>
      </Card>

      <Card className="pad garageSettings__card">
        <div className="garageSettings__accountRow">
          <h2 className="h2 garageSettings__sectionTitle">Аккаунт</h2>
          <button type="button" className="btn" data-variant="outline" onClick={logoutAndGoAuth}>
            Выйти
          </button>
        </div>
        <div className="garageSettings__accountRow garageSettings__dangerZone">
          <p className="muted small">Удаление аккаунта приведёт к потере профиля и личного гаража.</p>
          <button
            type="button"
            className="btn"
            data-variant="danger"
            disabled={deleteBusy}
            aria-busy={deleteBusy || undefined}
            onClick={() => void deleteAccount()}
          >
            {deleteBusy ? 'Удаление…' : 'Удалить аккаунт'}
          </button>
        </div>
      </Card>
    </div>
  )
}
