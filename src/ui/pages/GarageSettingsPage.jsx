import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthChangePasswordSection } from '../AuthChangePasswordSection.jsx'
import { BackNav, Card, CityComboBox, Input, PageLoadSpinner, PhoneRuInput, ServiceHint } from '../components.jsx'
import { bumpSessionRefresh, clearOwnerSession, hasOwnerSession, mergeSessionOwnerScalars } from '../auth.js'
import { useRepo, refreshAllClientData, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import {
  CITY_FIELD_DD_HINT,
  formatPhoneRuInput,
  normalizeGarageSlugInput,
  parseGarageSocialLines,
  PHOTO_UPLOAD_HINTS_PARAGRAPH,
} from '../../lib/format.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'
import { useAsyncActionLock } from '../useAsyncActionLock.js'

export default function GarageSettingsPage() {
  const navigate = useNavigate()
  const r = useRepo()
  const saveLock = useAsyncActionLock()
  const premiumLock = useAsyncActionLock()
  const { owner, mode, loading } = useDetailing()
  const socialRowIdRef = useRef(1)
  const nextSocialRowId = () => ++socialRowIdRef.current

  const [socialRows, setSocialRows] = useState(() => [{ id: 1, value: '' }])

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    garageCity: '',
    garageWebsite: '',
    garageSlug: '',
    garagePrivate: true,
    garageBannerEnabled: false,
    garageBanner: '',
    garageAvatar: '',
  })

  useEffect(() => {
    if (!owner?.email) return
    const lines = parseGarageSocialLines(owner.garageSocial || '')
    setSocialRows(
      lines.length > 0 ? lines.map((value) => ({ id: nextSocialRowId(), value })) : [{ id: nextSocialRowId(), value: '' }],
    )
    setDraft({
      name: owner.name || '',
      phone: formatPhoneRuInput(owner.phone || ''),
      garageCity: owner.garageCity || '',
      garageWebsite: owner.garageWebsite || '',
      garageSlug: owner.garageSlug || '',
      garagePrivate: Boolean(owner.garagePrivate),
      garageBannerEnabled: owner.garageBannerEnabled === true,
      garageBanner: owner.garageBanner || '',
      garageAvatar: owner.garageAvatar || '',
    })
  }, [
    owner?.email,
    owner?.name,
    owner?.phone,
    owner?.garageCity,
    owner?.garageWebsite,
    owner?.garageSocial,
    owner?.garageSlug,
    owner?.garagePrivate,
    owner?.garageBannerEnabled,
    owner?.garageBanner,
    owner?.garageAvatar,
  ])

  const previewUrl =
    typeof window !== 'undefined' && draft.garageSlug
      ? `${window.location.origin}/g/${normalizeGarageSlugInput(draft.garageSlug)}`
      : ''

  const [copyHint, setCopyHint] = useState('')
  const copyPublicUrl = useCallback(async () => {
    if (!previewUrl) return
    try {
      await navigator.clipboard.writeText(previewUrl)
      setCopyHint('Скопировано')
      window.setTimeout(() => setCopyHint(''), 2000)
    } catch {
      setCopyHint('Не удалось скопировать')
      window.setTimeout(() => setCopyHint(''), 2500)
    }
  }, [previewUrl])

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

  const urlPrefix = `${typeof window !== 'undefined' ? window.location.origin : ''}/g/`

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to="/garage">Мой гараж</Link>
            <span> / </span>
            <span>Настройки</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav fallbackTo="/garage" title="Назад" />
            <h1 className="h1 garageSettings__title" style={{ margin: 0 }}>
              Настройки гаража
            </h1>
          </div>
        </div>
      </div>

      <Card className="card pad garageSettings__card">
        <div className="field field--full serviceHint__fieldWrap garageSettings__privacyBlock" id="garage-settings-privacy">
          <div className="field__top serviceHint__fieldTop">
            <span className="field__label">Видимость страницы гаража</span>
            <ServiceHint scopeId="garage-settings-privacy" variant="compact" label="Справка: гараж или улица">
              <p className="serviceHint__panelText">
                По умолчанию включено <strong>«Остаться в гараже»</strong>: по ссылке гости не видят контакты и автомобили.
                <strong> Выйти на улицу</strong> — страница открыта для всех: телефон, город, сайт и ссылки (отдельные галочки не
                нужны). Партнёрский детейлинг, у которого есть ваше авто в кабинете, всё равно видит нужные данные для работы.
              </p>
            </ServiceHint>
          </div>
          <div className="garageSettings__privacyChoices row gap wrap" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn garageSettings__privacyBtn"
              data-variant={draft.garagePrivate ? 'primary' : 'outline'}
              onClick={() => setDraft((d) => ({ ...d, garagePrivate: true }))}
            >
              Остаться в гараже
            </button>
            <button
              type="button"
              className="btn garageSettings__privacyBtn"
              data-variant={!draft.garagePrivate ? 'primary' : 'outline'}
              onClick={() => setDraft((d) => ({ ...d, garagePrivate: false }))}
            >
              Выйти на улицу
            </button>
          </div>
          <p className="muted small" style={{ margin: '10px 0 0', maxWidth: '62ch', lineHeight: 1.5 }}>
            {draft.garagePrivate
              ? 'Сейчас: страница закрыта. Переход по ссылке не раскрывает ваши данные посторонним.'
              : 'Сейчас: страница открыта. Все заполненные ниже контакты и блок ссылок попадут на публичную страницу.'}
          </p>
        </div>

        <div className="formGrid historyFormGrid">
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-name">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Имя в гараже</span>
              <ServiceHint scopeId="garage-settings-name" variant="compact" label="Справка: имя в гараже">
                <p className="serviceHint__panelText">Как вас видят на странице гаража и в списках.</p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Например: Алексей"
            />
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-phone">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Телефон</span>
              <ServiceHint scopeId="garage-settings-phone" variant="compact" label="Справка: телефон">
                <p className="serviceHint__panelText">
                  Номер для РФ: в поле всегда префикс +7 и до 10 цифр (можно ввести 8… или без +7 — подставится само). На улице
                  виден только в режиме «Выйти на улицу» и если набран полный номер.
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
              <span className="field__label">Город для улицы</span>
              <ServiceHint scopeId="garage-settings-city" variant="compact" label="Справка: город">
                <p className="serviceHint__panelText">
                  {CITY_FIELD_DD_HINT} На улице город виден в режиме «Выйти на улицу», если поле заполнено.
                </p>
              </ServiceHint>
            </div>
            <CityComboBox value={draft.garageCity} maxItems={20} onChange={(v) => setDraft((d) => ({ ...d, garageCity: v }))} />
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-website">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Сайт или соцсеть</span>
              <ServiceHint scopeId="garage-settings-website" variant="compact" label="Справка: сайт">
                <p className="serviceHint__panelText">
                  Необязательно. На улице ссылка видна в режиме «Выйти на улицу», если поле заполнено.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.garageWebsite}
              onChange={(e) => setDraft((d) => ({ ...d, garageWebsite: e.target.value }))}
              placeholder="https://…"
              inputMode="url"
            />
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-social">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Доп. ссылки</span>
              <ServiceHint scopeId="garage-settings-social" variant="compact" label="Справка: доп. ссылки">
                <p className="serviceHint__panelText">
                  Telegram, Instagram и другие ссылки. На улице отображаются заполненные строки в режиме «Выйти на улицу».
                  Кнопка «+» добавляет ещё одно поле.
                </p>
              </ServiceHint>
            </div>
            <div className="garageSettings__socialList">
              {socialRows.map((row, i) => {
                const isLast = i === socialRows.length - 1
                return (
                  <div key={row.id} className="garageSettings__socialRow">
                    <Input
                      className="input garageSettings__socialInput"
                      value={row.value}
                      onChange={(e) => {
                        const v = e.target.value
                        setSocialRows((rows) => rows.map((r, j) => (j === i ? { ...r, value: v } : r)))
                      }}
                      placeholder="https://t.me/… или https://instagram.com/…"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label={`Дополнительная ссылка ${i + 1}`}
                    />
                    {isLast ? (
                      <button
                        type="button"
                        className="btn garageSettings__socialAddBtn"
                        data-variant="outline"
                        aria-label="Добавить поле для ссылки"
                        title="Добавить поле"
                        onClick={() =>
                          setSocialRows((rows) => [...rows, { id: nextSocialRowId(), value: '' }])
                        }
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-slug">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Публичная ссылка на гараж</span>
              <ServiceHint scopeId="garage-settings-slug" variant="compact" label="Справка: адрес страницы">
                <p className="serviceHint__panelText">
                  Сайт и <span className="mono">/g/</span> подставляются сами. Справа введите имя страницы (латиница, цифры, дефис;
                  можно печатать по-русски — преобразуем). «Копировать» копирует полный URL. Адрес уникален среди владельцев.
                </p>
              </ServiceHint>
            </div>
            <div className="garageSettings__urlComposer">
              <div className="garageSettings__urlComposerInner">
                <span className="garageSettings__urlPrefix mono" title={urlPrefix}>
                  {urlPrefix}
                </span>
                <Input
                  className="input mono garageSettings__urlSlugInput"
                  value={draft.garageSlug}
                  onChange={(e) => setDraft((d) => ({ ...d, garageSlug: normalizeGarageSlugInput(e.target.value) }))}
                  placeholder="ivan-garage"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  lang="en"
                  aria-label="Имя страницы в адресе после /g/"
                />
              </div>
              <button
                type="button"
                className="btn garageSettings__urlCopyBtn"
                data-variant="outline"
                disabled={!previewUrl}
                onClick={() => copyPublicUrl()}
              >
                Копировать
              </button>
            </div>
            {copyHint ? (
              <p className="muted small garageSettings__copyHint" role="status">
                {copyHint}
              </p>
            ) : null}
          </div>
        </div>

        <div className="topBorder garageSettings__mediaWrap">
          <div className="garageSettings__mediaHeadRow" id="garage-settings-media">
            <div className="garageSettings__mediaHeading">
              {draft.garageBannerEnabled ? 'Аватар и баннер' : 'Аватар'}
            </div>
            <ServiceHint scopeId="garage-settings-media" variant="compact" label="Справка: фото гаража">
              <p className="serviceHint__panelText">
                Нажмите на превью, чтобы выбрать или заменить фото. Аватар — квадрат, до ~1&nbsp;МБ (до 512×512). Баннер — широкий
                фон сверху (до ~2,5&nbsp;МБ, до 2000×1200). Включение и выключение обложки на страницах — переключатель ниже; подробности
                в справке у переключателя. Сброс фото — крестик в углу превью.
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
                  Широкое фото сверху страницы «Мой гараж». То же изображение используется как фон на вашей публичной странице
                  гаража, если в настройках включён режим «Выйти на улицу».
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

        <div
          className="field field--full garageSettings__premiumBlock"
          style={{ marginTop: 8, paddingTop: 18, borderTop: '1px solid color-mix(in oklab, var(--border) 88%, transparent)' }}
        >
          <div className="field__top">
            <span className="field__label">Тариф (тест)</span>
          </div>
          <p className="muted small" style={{ margin: '0 0 10px', maxWidth: '62ch', lineHeight: 1.5 }}>
            Флаг Premium для отладки и демо. Лимиты гаража в MVP по-прежнему задаются правилами сервиса.
          </p>
          <button
            type="button"
            className="btn"
            data-variant="outline"
            disabled={premiumLock.pending}
            onClick={() =>
              void premiumLock.run(async () => {
                if (!owner?.email || !r.updateOwnerMe) {
                  alert('Не удалось обновить тариф.')
                  return
                }
                try {
                  const next = await r.updateOwnerMe({ isPremium: !owner.isPremium })
                  if (next?.owner) mergeSessionOwnerScalars(next.owner)
                  invalidateRepo()
                  bumpSessionRefresh()
                  const prem = Boolean(next?.owner?.isPremium)
                  alert(prem ? 'Premium включён.' : 'Premium выключен.')
                } catch {
                  alert('Не удалось обновить тариф.')
                }
              })
            }
          >
            {owner?.isPremium ? 'Отключить Premium' : 'Подключить Premium'}
          </button>
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

        <div className="row gap wrap historyFormActions garageSettings__actionsRow">
          <button
            type="button"
            className="btn"
            data-variant="primary"
            disabled={saveLock.pending}
            aria-busy={saveLock.pending || undefined}
            onClick={() =>
              void saveLock.run(async () => {
              const slug = normalizeGarageSlugInput(draft.garageSlug)
              const socialJoined = socialRows
                .map((row) => String(row.value || '').trim())
                .filter(Boolean)
                .join('\n')
              const prevBanner = owner?.garageBanner ?? ''
              const prevAvatar = owner?.garageAvatar ?? ''
              const prevBannerEnabled = owner?.garageBannerEnabled === true
              const onStreet = !draft.garagePrivate
              const patch = {
                name: draft.name.trim(),
                phone: formatPhoneRuInput(draft.phone).trim(),
                garageCity: draft.garageCity.trim(),
                garageWebsite: draft.garageWebsite.trim(),
                garageSocial: socialJoined,
                garageSlug: slug,
                garagePrivate: draft.garagePrivate,
                showPhonePublic:
                  onStreet &&
                    formatPhoneRuInput(draft.phone).replace(/^\+7\s*/, '').replace(/\D/g, '').length >= 10,
                showCityPublic: onStreet && Boolean(draft.garageCity.trim()),
                showWebsitePublic: onStreet && Boolean(draft.garageWebsite.trim()),
                showSocialPublic: onStreet && socialJoined.length > 0,
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
