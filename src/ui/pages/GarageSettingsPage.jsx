import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { BackNav, Card, Input, ServiceHint } from '../components.jsx'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import { mergeSessionOwnerScalars } from '../auth.js'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import {
  firstGarageSocialLine,
  formatPhoneRuInput,
  normalizeGarageSlugInput,
  ownerCityPublicFlag,
  ownerPublicFlagTrue,
} from '../../lib/format.js'

export default function GarageSettingsPage() {
  const navigate = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const setupFlow = sp.get('setup') === '1'
  const r = useRepo()
  const { owner, mode } = useDetailing()
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    garageCity: '',
    garageSlug: '',
    showCityPublic: true,
    showPhonePublic: false,
    garageWebsite: '',
    showWebsitePublic: false,
    garageSocial: '',
    showSocialPublic: false,
    garageBanner: '',
    garageAvatar: '',
  })

  // Только смена аккаунта или сохранённая версия профиля (updatedAt). Иначе при обновлении lastVisitAt и др. черновик затирался бы.
  useEffect(() => {
    if (!owner?.email) return
    setDraft({
      name: owner.name || '',
      phone: owner.phone || '',
      garageCity: owner.garageCity || '',
      garageSlug: owner.garageSlug || '',
      showCityPublic: ownerCityPublicFlag(owner.showCityPublic),
      showPhonePublic: ownerPublicFlagTrue(owner.showPhonePublic),
      garageWebsite: owner.garageWebsite || '',
      showWebsitePublic: ownerPublicFlagTrue(owner.showWebsitePublic),
      garageSocial: firstGarageSocialLine(owner.garageSocial),
      showSocialPublic: ownerPublicFlagTrue(owner.showSocialPublic),
      garageBanner: owner.garageBanner || '',
      garageAvatar: owner.garageAvatar || '',
    })
  }, [owner?.email, owner?.updatedAt])

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

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (mode !== 'owner' || !owner?.email) return <Navigate to="/auth/owner" replace />

  const email = owner.email
  const urlPrefix = `${typeof window !== 'undefined' ? window.location.origin : ''}/g/`

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to="/garage">В гараж</Link>
            <span> / </span>
            <span>Настройки</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav to="/garage" title="В гараж" />
            <h1 className="h1 garageSettings__title" style={{ margin: 0 }}>
              Настройки гаража
            </h1>
          </div>
        </div>
      </div>

      <Card className="card pad garageSettings__card">
        <MediaBannerAvatarBlock
          variant="garage"
          bannerUrl={draft.garageBanner}
          avatarUrl={draft.garageAvatar}
          onBannerUrl={(url) => setDraft((d) => ({ ...d, garageBanner: url }))}
          onAvatarUrl={(url) => setDraft((d) => ({ ...d, garageAvatar: url }))}
        />

        <div className="topBorder garageSettings__formAfterMedia">
          <div className="formGrid historyFormGrid">
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-hint-name">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Имя в гараже</span>
              <ServiceHint scopeId="garage-settings-hint-name" label="Справка: имя в гараже">
                <p className="serviceHint__panelText">
                  Так вас видят в «Гараж» и на публичной витрине по ссылке <span className="mono">/g/…</span>.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Например: Алексей"
            />
          </div>
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-hint-city">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Город</span>
              <ServiceHint scopeId="garage-settings-hint-city" label="Справка: город">
                <p className="serviceHint__panelText">
                  В «Гараж» город отображается всегда, если поле заполнено. На публичной витрине — только при галочке ниже (рядом с
                  числом автомобилей).
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.garageCity}
              onChange={(e) => setDraft((d) => ({ ...d, garageCity: e.target.value }))}
              placeholder="Например: Москва"
              autoComplete="address-level2"
            />
            <label className="garageSettings__phonePublicCheck">
              <input
                type="checkbox"
                checked={draft.showCityPublic}
                onChange={(e) => setDraft((d) => ({ ...d, showCityPublic: e.target.checked }))}
              />
              <span>Показывать город на публичной странице гаража</span>
            </label>
          </div>
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-hint-phone">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Телефон</span>
              <ServiceHint scopeId="garage-settings-hint-phone" label="Справка: телефон">
                <p className="serviceHint__panelText">
                  Номер для связи с вами. Чтобы показать его посетителям публичной страницы гаража, отметьте галочку ниже.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(e.target.value) }))}
              placeholder="+7…"
            />
            <label className="garageSettings__phonePublicCheck">
              <input
                type="checkbox"
                checked={draft.showPhonePublic}
                onChange={(e) => setDraft((d) => ({ ...d, showPhonePublic: e.target.checked }))}
              />
              <span>Показывать телефон на публичной странице</span>
            </label>
          </div>
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-hint-website">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Сайт</span>
              <ServiceHint scopeId="garage-settings-hint-website" label="Справка: сайт">
                <p className="serviceHint__panelText">
                  Укажите полный адрес с <span className="mono">https://</span> или домен. На витрине ссылка откроется в новой вкладке при
                  включённой публикации ниже.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              inputMode="url"
              autoComplete="url"
              value={draft.garageWebsite}
              onChange={(e) => setDraft((d) => ({ ...d, garageWebsite: e.target.value }))}
              placeholder="https://example.com"
            />
            <label className="garageSettings__phonePublicCheck">
              <input
                type="checkbox"
                checked={draft.showWebsitePublic}
                onChange={(e) => setDraft((d) => ({ ...d, showWebsitePublic: e.target.checked }))}
              />
              <span>Показывать сайт на публичной странице</span>
            </label>
          </div>
          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-hint-social">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Ссылка (соцсеть и т.п.)</span>
              <ServiceHint scopeId="garage-settings-hint-social" label="Справка: ссылка на соцсеть">
                <p className="serviceHint__panelText">
                  Одна ссылка: Instagram, Telegram, YouTube и т.д. На публичной витрине она появится только при отметке «разрешить
                  публикацию» ниже.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              inputMode="url"
              autoComplete="url"
              value={draft.garageSocial}
              onChange={(e) => setDraft((d) => ({ ...d, garageSocial: e.target.value }))}
              placeholder="https://t.me/username"
              spellCheck={false}
            />
            <label className="garageSettings__phonePublicCheck">
              <input
                type="checkbox"
                checked={draft.showSocialPublic}
                onChange={(e) => setDraft((d) => ({ ...d, showSocialPublic: e.target.checked }))}
              />
              <span>Разрешить публикацию этой ссылки на публичной странице гаража</span>
            </label>
          </div>
          <div
            className="field field--full garageSettings__urlField serviceHint__fieldWrap"
            id="garage-settings-hint-public-url"
          >
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Публичная ссылка на гараж</span>
              <ServiceHint scopeId="garage-settings-hint-public-url" label="Справка: публичная ссылка">
                <p className="serviceHint__panelText">
                  На витрине всегда видны имя, число автомобилей и (при отметке у поля «Город») город. Телефон, сайт и соцсеть — только при
                  соответствующих галочках выше.
                </p>
                <p className="serviceHint__panelText">
                  Префикс с <span className="mono">/g/</span> подставляется сам; справа введите короткое имя страницы (латиница, цифры, дефис
                  — можно печатать по-русски, преобразуем). Кнопка «Копировать» копирует полный адрес. Имя уникально среди владельцев на этом
                  устройстве.
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
        </div>

        <div className="row gap wrap historyFormActions" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={() => {
              const slug = normalizeGarageSlugInput(draft.garageSlug)
              const next = r.updateOwner(email, {
                name: draft.name.trim(),
                phone: draft.phone.trim(),
                garageCity: draft.garageCity.trim(),
                garageSlug: slug,
                showCityPublic: draft.showCityPublic,
                showPhonePublic: draft.showPhonePublic,
                garageWebsite: draft.garageWebsite.trim(),
                showWebsitePublic: draft.showWebsitePublic,
                garageSocial: firstGarageSocialLine(draft.garageSocial),
                showSocialPublic: draft.showSocialPublic,
                garageBanner: draft.garageBanner,
                garageAvatar: draft.garageAvatar,
              })
              if (!next) {
                alert('Не удалось сохранить. Возможно, адрес страницы уже занят другим пользователем на этом устройстве.')
                return
              }
              mergeSessionOwnerScalars(next)
              invalidateRepo()
              if (setupFlow) {
                const after = loc.state?.afterGarageSetup
                const okAfter =
                  typeof after === 'string' &&
                  after.startsWith('/') &&
                  !after.startsWith('/auth') &&
                  after !== '/garage/settings'
                if (okAfter) {
                  navigate(after, { replace: true })
                } else {
                  navigate('/garage?from=setup', { replace: true })
                }
              } else {
                navigate('/garage', { replace: true })
              }
            }}
          >
            Сохранить
          </button>
          <button type="button" className="btn" data-variant="ghost" onClick={() => navigate('/garage')}>
            В гараж
          </button>
        </div>
      </Card>
    </div>
  )
}
