import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { BackNav, Card, ComboBox, Input, ServiceHint } from '../components.jsx'
import { bumpSessionRefresh } from '../auth.js'
import { hasOwnerSession } from '../auth.js'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { normalizeGarageSlugInput, parseGarageSocialLines } from '../../lib/format.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'
import { RUSSIAN_MILLION_PLUS_CITIES } from '../../lib/russianMillionCities.js'

export default function GarageSettingsPage() {
  const navigate = useNavigate()
  const r = useRepo()
  const { owner, mode } = useDetailing()
  const socialRowIdRef = useRef(1)
  const nextSocialRowId = () => ++socialRowIdRef.current

  const [socialRows, setSocialRows] = useState(() => [{ id: 1, value: '' }])

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    garageCity: '',
    showCityPublic: false,
    garageWebsite: '',
    showWebsitePublic: false,
    garageSlug: '',
    showPhonePublic: false,
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
      phone: owner.phone || '',
      garageCity: owner.garageCity || '',
      showCityPublic: Boolean(owner.showCityPublic),
      garageWebsite: owner.garageWebsite || '',
      showWebsitePublic: Boolean(owner.showWebsitePublic),
      garageSlug: owner.garageSlug || '',
      showPhonePublic: Boolean(owner.showPhonePublic),
      garageBanner: owner.garageBanner || '',
      garageAvatar: owner.garageAvatar || '',
    })
  }, [
    owner?.email,
    owner?.name,
    owner?.phone,
    owner?.garageCity,
    owner?.showCityPublic,
    owner?.garageWebsite,
    owner?.showWebsitePublic,
    owner?.garageSocial,
    owner?.garageSlug,
    owner?.showPhonePublic,
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

  if (mode === 'detailing') return <Navigate to="/detailing" replace />
  if (!hasOwnerSession()) return <Navigate to="/auth/owner" replace />

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
            <BackNav to="/garage" title="В мой гараж" />
            <h1 className="h1 garageSettings__title" style={{ margin: 0 }}>
              Настройки гаража
            </h1>
          </div>
        </div>
      </div>

      <Card className="card pad garageSettings__card">
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
                  Для связи с вами. Ниже можно включить показ того же номера на публичной странице гаража.
                </p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
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

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-city">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Город для улицы</span>
              <ServiceHint scopeId="garage-settings-city" variant="compact" label="Справка: город">
                <p className="serviceHint__panelText">
                  В списке — города России с населением свыше 1 млн; можно ввести любой другой город вручную. Показывается на /g/…
                  только если включено «Показывать город» ниже.
                </p>
              </ServiceHint>
            </div>
            <ComboBox
              value={draft.garageCity}
              options={RUSSIAN_MILLION_PLUS_CITIES}
              placeholder="Города-миллионники в списке; можно ввести любой город"
              maxItems={20}
              onChange={(v) => setDraft((d) => ({ ...d, garageCity: v }))}
            />
            <label className="garageSettings__phonePublicCheck">
              <input
                type="checkbox"
                checked={draft.showCityPublic}
                onChange={(e) => setDraft((d) => ({ ...d, showCityPublic: e.target.checked }))}
              />
              <span>Показывать город на публичной странице</span>
            </label>
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-website">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Сайт или соцсеть</span>
              <ServiceHint scopeId="garage-settings-website" variant="compact" label="Справка: сайт">
                <p className="serviceHint__panelText">Необязательно. На улице появится только при включённой публикации.</p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.garageWebsite}
              onChange={(e) => setDraft((d) => ({ ...d, garageWebsite: e.target.value }))}
              placeholder="https://…"
              inputMode="url"
            />
            <label className="garageSettings__phonePublicCheck">
              <input
                type="checkbox"
                checked={draft.showWebsitePublic}
                onChange={(e) => setDraft((d) => ({ ...d, showWebsitePublic: e.target.checked }))}
              />
              <span>Показывать ссылку на улице</span>
            </label>
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="garage-settings-social">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Доп. ссылки</span>
              <ServiceHint scopeId="garage-settings-social" variant="compact" label="Справка: доп. ссылки">
                <p className="serviceHint__panelText">
                  Telegram, Instagram и другие ссылки. Заполненные поля показываются на публичной странице гаража. Кнопка «+» добавляет
                  ещё одно поле.
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
            <div className="garageSettings__mediaHeading">Аватар и баннер</div>
            <ServiceHint scopeId="garage-settings-media" variant="compact" label="Справка: фото гаража">
              <p className="serviceHint__panelText">
                Нажмите на область превью, чтобы выбрать или заменить фото. Аватар — квадрат, до ~1&nbsp;МБ (до 512×512); баннер
                — широкий, до ~2,5&nbsp;МБ (до 2000×1200). Если фото уже есть, внизу можно убрать его текстовой ссылкой.
              </p>
            </ServiceHint>
          </div>
          <MediaBannerAvatarBlock
            variant="garage"
            title=""
            bannerUrl={draft.garageBanner}
            avatarUrl={draft.garageAvatar}
            onBannerUrl={(url) => setDraft((d) => ({ ...d, garageBanner: url }))}
            onAvatarUrl={(url) => setDraft((d) => ({ ...d, garageAvatar: url }))}
          />
        </div>

        <div className="row gap wrap historyFormActions garageSettings__actionsRow">
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={async () => {
              const slug = normalizeGarageSlugInput(draft.garageSlug)
              const socialJoined = socialRows
                .map((r) => String(r.value || '').trim())
                .filter(Boolean)
                .join('\n')
              const prevBanner = owner?.garageBanner ?? ''
              const prevAvatar = owner?.garageAvatar ?? ''
              const patch = {
                name: draft.name.trim(),
                phone: draft.phone.trim(),
                garageCity: draft.garageCity.trim(),
                showCityPublic: draft.showCityPublic,
                garageWebsite: draft.garageWebsite.trim(),
                showWebsitePublic: draft.showWebsitePublic,
                garageSocial: socialJoined,
                showSocialPublic: socialJoined.length > 0,
                garageSlug: slug,
                showPhonePublic: draft.showPhonePublic,
              }
              if ((draft.garageBanner || '') !== (prevBanner || '')) {
                patch.garageBanner = draft.garageBanner
              }
              if ((draft.garageAvatar || '') !== (prevAvatar || '')) {
                patch.garageAvatar = draft.garageAvatar
              }
              try {
                await r.updateOwnerMe(patch)
              } catch (e) {
                alert(
                  formatHttpErrorMessage(
                    e,
                    'Не удалось сохранить. Проверьте связь с API и данные формы.',
                  ),
                )
                if (e instanceof HttpError && e.status === 401) {
                  navigate('/auth/owner', { replace: true })
                }
                return
              }
              invalidateRepo()
              bumpSessionRefresh()
              navigate('/garage', { replace: true })
            }}
          >
            Сохранить
          </button>
          <button type="button" className="btn" data-variant="ghost" onClick={() => navigate('/garage')}>
            К гаражу
          </button>
        </div>
      </Card>
    </div>
  )
}
