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

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    garageCity: '',
    garageBannerEnabled: false,
    garageBanner: '',
    garageAvatar: '',
  })

  useEffect(() => {
    if (!owner?.email) return
    setDraft({
      name: owner.name || '',
      phone: formatPhoneRuInput(owner.phone || ''),
      garageCity: owner.garageCity || '',
      garageBannerEnabled: owner.garageBannerEnabled === true,
      garageBanner: owner.garageBanner || '',
      garageAvatar: owner.garageAvatar || '',
    })
  }, [
    owner?.email,
    owner?.name,
    owner?.phone,
    owner?.garageCity,
    owner?.garageBannerEnabled,
    owner?.garageBanner,
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

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to="/garage">Мой гараж</Link>
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
              {draft.garageBannerEnabled ? 'Аватар и баннер' : 'Аватар'}
            </div>
            <ServiceHint scopeId="garage-settings-media" variant="compact" label="Справка: фото гаража">
              <p className="serviceHint__panelText">
                Нажмите на превью, чтобы выбрать или заменить фото. Аватар — квадратное фото для узнаваемости. Баннер — широкая
                картинка сверху страницы гаража. Включить или скрыть баннер на странице можно переключателем ниже (рядом со своей
                справкой). Убрать загруженное фото — крестик в углу превью.
              </p>
              <p className="serviceHint__panelText" style={{ marginTop: 10 }}>
                {PHOTO_UPLOAD_HINTS_PARAGRAPH}
              </p>
            </ServiceHint>
          </div>
          <div
            className="field field--full serviceHint__fieldWrap garageSettings__bannerField"
            id="garage-settings-banner"
          >
            <div className="field__top serviceHint__fieldTop">
              <div className="field__label garageSettings__bannerCheckGroup">
                <label className="garageSettings__bannerCheckRow" htmlFor="garage-settings-banner-enabled">
                  <input
                    id="garage-settings-banner-enabled"
                    type="checkbox"
                    className="garageSettings__bannerCheckInput"
                    checked={draft.garageBannerEnabled}
                    onChange={(e) => setDraft((d) => ({ ...d, garageBannerEnabled: e.target.checked }))}
                  />
                  <span className="garageSettings__bannerCheckText">Показывать баннер на странице гаража</span>
                </label>
              </div>
              <ServiceHint scopeId="garage-settings-banner" variant="compact" label="Справка: баннер гаража">
                <p className="serviceHint__panelText">
                  Широкое фото сверху страницы «Мой гараж». То же изображение может использоваться как фон на публичной странице
                  гаража, если она у вас включена.
                </p>
                <p className="serviceHint__panelText" style={{ marginTop: 10 }}>
                  Если выключить показ баннера, обложка не отображается, но файл в профиле сохраняется — позже показ можно снова
                  включить.
                </p>
              </ServiceHint>
            </div>
          </div>
          <MediaBannerAvatarBlock
            variant="garage"
            title=""
            bannerLabel="Настройка баннера"
            showBannerColumn={draft.garageBannerEnabled}
            bannerUrl={draft.garageBanner}
            avatarUrl={draft.garageAvatar}
            onBannerUrl={(url) => setDraft((d) => ({ ...d, garageBanner: url }))}
            onAvatarUrl={(url) => setDraft((d) => ({ ...d, garageAvatar: url }))}
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

        <p className="muted small garageSettings__profileSaveHint" style={{ marginTop: 18, lineHeight: 1.5, maxWidth: '62ch' }}>
          Кнопки «Сохранить» и «Отменить» ниже относятся к профилю гаража (имя, телефон, город, фото). Пароль входа меняется в блоке
          выше.
        </p>

        <div className="row gap wrap historyFormActions garageSettings__actionsRow">
          <button
            type="button"
            className="btn"
            data-variant="primary"
            disabled={saveLock.pending}
            aria-busy={saveLock.pending || undefined}
            onClick={() =>
              void saveLock.run(async () => {
                const prevBanner = owner?.garageBanner ?? ''
                const prevAvatar = owner?.garageAvatar ?? ''
                const prevBannerEnabled = owner?.garageBannerEnabled === true
                const patch = {
                  name: draft.name.trim(),
                  phone: formatPhoneRuInput(draft.phone).trim(),
                  garageCity: draft.garageCity.trim(),
                }
                if (draft.garageBannerEnabled !== prevBannerEnabled) {
                  patch.garageBannerEnabled = draft.garageBannerEnabled
                }
                if ((draft.garageBanner || '') !== (prevBanner || '')) {
                  patch.garageBanner = draft.garageBanner
                }
                if ((draft.garageAvatar || '') !== (prevAvatar || '')) {
                  patch.garageAvatar = draft.garageAvatar
                }
                try {
                  const res = await r.updateOwnerMe(patch)
                  if (res?.owner) mergeSessionOwnerScalars(res.owner)
                } catch (e) {
                  alert(
                    formatHttpErrorMessage(
                      e,
                      'Не удалось сохранить. Проверьте интернет и правильность полей.',
                    ),
                  )
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
        </div>
      </Card>
    </div>
  )
}
