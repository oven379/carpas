import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { AuthChangePasswordSection } from '../AuthChangePasswordSection.jsx'
import { BackNav, Card, CityComboBox, Input, PageLoadSpinner, PhoneRuInput, ServiceHint } from '../components.jsx'
import { clearOwnerSession, hasOwnerSession, mergeSessionOwnerScalars } from '../auth.js'
import { useRepo, refreshAllClientData } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { CITY_FIELD_DD_HINT, formatPhoneRuInput, PHOTO_UPLOAD_HINTS_PARAGRAPH } from '../../lib/format.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'
import { useAsyncActionLock } from '../useAsyncActionLock.js'

export default function GarageSettingsPage() {
  const navigate = useNavigate()
  const r = useRepo()
  const saveLock = useAsyncActionLock()
  const { owner, mode, loading } = useDetailing()
  const [deleteBusy, setDeleteBusy] = useState(false)

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

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to="/garage">Гараж</Link>
            <span> / </span>
            <span>Настройки кабинета</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav fallbackTo="/garage" title="Назад" />
            <h1 className="h1 garageSettings__title" style={{ margin: 0 }}>
              Личный кабинет
            </h1>
          </div>
        </div>
      </div>

      <Card className="card pad garageSettings__card">
        <div className="formGrid historyFormGrid">
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-name">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Имя</span>
              <ServiceHint scopeId="garage-settings-name" variant="compact" label="Справка: имя">
                <p className="serviceHint__panelText">
                  Подставляется из регистрации; при необходимости можно изменить — так вас видят в гараже и в списках.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Например: Алексей"
              autoComplete="name"
            />
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-email">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Электронная почта</span>
              <ServiceHint scopeId="garage-settings-email" variant="compact" label="Справка: почта">
                <p className="serviceHint__panelText">Адрес из регистрации, вход в кабинет. Изменить почту здесь нельзя.</p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              type="email"
              value={ownerEmail}
              readOnly
              aria-readonly="true"
              autoComplete="email"
            />
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-phone">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Телефон</span>
              <ServiceHint scopeId="garage-settings-phone" variant="compact" label="Справка: телефон">
                <p className="serviceHint__panelText">
                  Номер для РФ: в поле всегда префикс +7 и до 10 цифр (можно ввести 8… или без +7 — подставится само).
                </p>
              </ServiceHint>
            </div>
            <PhoneRuInput
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(e.target.value) }))}
              onBlur={() => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(d.phone) }))}
            />
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-city">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Город</span>
              <ServiceHint scopeId="garage-settings-city" variant="compact" label="Справка: город">
                <p className="serviceHint__panelText">{CITY_FIELD_DD_HINT}</p>
              </ServiceHint>
            </div>
            <CityComboBox value={draft.garageCity} maxItems={20} onChange={(v) => setDraft((d) => ({ ...d, garageCity: v }))} />
          </div>
        </div>

        <div className="topBorder garageSettings__mediaWrap">
          <div className="garageSettings__mediaHeadRow" id="garage-settings-media">
            <div className="garageSettings__mediaHeading">
              Аватар
            </div>
            <ServiceHint scopeId="garage-settings-media" variant="compact" label="Справка: фото гаража">
              <p className="serviceHint__panelText">
                Нажмите на превью, чтобы выбрать или заменить фото. Аватар — квадратное фото для узнаваемости. Убрать
                загруженное фото — крестик в углу превью.
              </p>
              <p className="serviceHint__panelText" style={{ marginTop: 10 }}>
                {PHOTO_UPLOAD_HINTS_PARAGRAPH}
              </p>
            </ServiceHint>
          </div>
          <MediaBannerAvatarBlock
            variant="garage"
            title=""
            showBannerColumn={false}
            avatarUrl={draft.garageAvatar}
            onAvatarUrl={(url) => setDraft((d) => ({ ...d, garageAvatar: url }))}
            placeholderEmail={ownerEmail}
            placeholderFallback={String(draft.name || '').trim()}
          />
        </div>

        <AuthChangePasswordSection
          variant="owner"
          r={r}
          onPasswordChanged={() => {
            alert('Пароль обновлён. Войдите снова, указав почту и новый пароль.')
            clearOwnerSession()
            refreshAllClientData()
            navigate('/auth/owner', { replace: true })
          }}
        />

        <div className="topBorder" style={{ marginTop: 22, paddingTop: 18 }}>
          <h2 className="h2" style={{ margin: '0 0 8px' }}>
            Удаление аккаунта
          </h2>
          <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.5, maxWidth: '62ch' }}>
            Вы можете удалить аккаунт владельца прямо из приложения. После подтверждения будет удалён профиль, сессии входа,
            push-токены и личный гараж.
          </p>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={deleteBusy}
            aria-busy={deleteBusy || undefined}
            onClick={() => void deleteAccount()}
          >
            {deleteBusy ? 'Удаление…' : 'Удалить аккаунт'}
          </button>
        </div>

        <p className="muted small garageSettings__profileSaveHint" style={{ marginTop: 18, lineHeight: 1.5, maxWidth: '62ch' }}>
          Кнопки «Сохранить» и «Отменить» ниже относятся к профилю гаража (имя, телефон, город, фото). Пароль входа меняется в блоке
          выше.
        </p>

        <div className="garageSettings__actionsStack">
          <button
            type="button"
            className="btn"
            data-variant="primary"
            disabled={saveLock.pending}
            aria-busy={saveLock.pending || undefined}
            onClick={() =>
              void saveLock.run(async () => {
                const prevAvatar = owner?.garageAvatar ?? ''
                const patch = {
                  name: draft.name.trim(),
                  phone: formatPhoneRuInput(draft.phone).trim(),
                  garageCity: draft.garageCity.trim(),
                }
                if ((draft.garageAvatar || '') !== (prevAvatar || '')) {
                  patch.garageAvatar = draft.garageAvatar
                }
                try {
                  const res = await r.updateOwnerMe(patch)
                  if (res?.owner) mergeSessionOwnerScalars(res.owner)
                } catch (e) {
                  alert(formatHttpErrorMessage(e))
                  if (e instanceof HttpError && e.status === 401) {
                    navigate('/auth/owner', { replace: true })
                  }
                  return
                }
                refreshAllClientData()
                navigate('/garage', { replace: true })
              })
            }
          >
            {saveLock.pending ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button type="button" className="btn" data-variant="ghost" onClick={cancelAndGoBack}>
            Отменить
          </button>
          <button type="button" className="btn garageSettings__logoutBtn" data-variant="outline" onClick={logoutAndGoAuth}>
            Выйти
          </button>
        </div>
      </Card>
    </div>
  )
}
