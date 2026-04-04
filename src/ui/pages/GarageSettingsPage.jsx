import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { BackNav, Card, Field, Input } from '../components.jsx'
import { bumpSessionRefresh } from '../auth.js'
import { hasOwnerSession } from '../auth.js'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import { normalizeGarageSlugInput } from '../../lib/format.js'

export default function GarageSettingsPage() {
  const navigate = useNavigate()
  const r = useRepo()
  const { owner, mode } = useDetailing()
  const bannerRef = useRef(null)
  const avatarRef = useRef(null)

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    garageSlug: '',
    showPhonePublic: false,
    garageBanner: '',
    garageAvatar: '',
  })

  useEffect(() => {
    if (!owner?.email) return
    setDraft({
      name: owner.name || '',
      phone: owner.phone || '',
      garageSlug: owner.garageSlug || '',
      showPhonePublic: Boolean(owner.showPhonePublic),
      garageBanner: owner.garageBanner || '',
      garageAvatar: owner.garageAvatar || '',
    })
  }, [
    owner?.email,
    owner?.name,
    owner?.phone,
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

  const email = owner.email
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
          <p className="muted garageSettings__intro">
            Баннер и аватар, имя и телефон — как на странице детейлинга. Публичная ссылка: <strong>/g/ваш-адрес</strong>
            (латиница, цифры, дефис).
          </p>
        </div>
      </div>

      <Card className="card pad garageSettings__card">
        <div className="formGrid historyFormGrid">
          <Field className="field--full" label="Имя в гараже" hint="Как вас видят на странице гаража">
            <Input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Например: Алексей"
            />
          </Field>
          <div className="field field--full">
            <div className="field__top">
              <span className="field__label">Телефон</span>
              <span className="field__hint">Для связи; ниже — показать тот же номер на публичной странице гаража</span>
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
          <div className="field field--full">
            <div className="field__top">
              <span className="field__label">Публичная ссылка на гараж</span>
              <span className="field__hint">
                Сайт и <span className="mono">/g/</span> подставляются сами; справа введите имя страницы (латиница, цифры, дефис — можно печатать по-русски, преобразуем). Полная ссылка видна целиком; «Копировать» копирует её в буфер. Адрес уникален среди владельцев на этом устройстве.
              </span>
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
          <div className="garageSettings__mediaHeading">Аватар и баннер</div>
          <p className="muted small garageSettings__mediaLead">
            Сначала аватар, затем баннер. Нажмите на превью — выбрать или заменить файл; «Убрать» — удалить. Аватар — квадрат, до ~1&nbsp;МБ (до 512×512); баннер — широкий, до ~2,5&nbsp;МБ (до 2000×1200).
          </p>
          <div className="garageSettings__mediaCols">
            <div className="garageSettings__mediaCol garageSettings__mediaCol--avatar">
              <div className="garageSettings__mediaSublabel">Аватар</div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="srOnly"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  try {
                    const url = await compressImageFile(f, {
                      maxW: 512,
                      maxH: 512,
                      quality: 0.86,
                      maxBytes: 1024 * 1024,
                    })
                    if (url) setDraft((d) => ({ ...d, garageAvatar: url }))
                  } catch {
                    /* ignore */
                  }
                }}
              />
              <button
                type="button"
                className="garageSettings__thumb garageSettings__thumb--avatar"
                onClick={() => avatarRef.current?.click?.()}
                aria-label={draft.garageAvatar ? 'Заменить аватар' : 'Загрузить аватар'}
              >
                {draft.garageAvatar ? (
                  <img alt="Превью аватара" src={draft.garageAvatar} />
                ) : (
                  <span className="garageSettings__thumbEmpty">Квадрат · нажмите</span>
                )}
              </button>
              {draft.garageAvatar ? (
                <button
                  type="button"
                  className="btn garageSettings__mediaRemove"
                  data-variant="ghost"
                  onClick={() => setDraft((d) => ({ ...d, garageAvatar: '' }))}
                >
                  Убрать аватар
                </button>
              ) : null}
            </div>
            <div className="garageSettings__mediaCol garageSettings__mediaCol--banner">
              <div className="garageSettings__mediaSublabel">Баннер</div>
              <input
                ref={bannerRef}
                type="file"
                accept="image/*"
                className="srOnly"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  try {
                    const url = await compressImageFile(f, {
                      maxW: 2000,
                      maxH: 1200,
                      quality: 0.82,
                      maxBytes: 2.5 * 1024 * 1024,
                    })
                    if (url) setDraft((d) => ({ ...d, garageBanner: url }))
                  } catch {
                    /* ignore */
                  }
                }}
              />
              <button
                type="button"
                className="garageSettings__thumb garageSettings__thumb--banner"
                onClick={() => bannerRef.current?.click?.()}
                aria-label={draft.garageBanner ? 'Заменить баннер' : 'Загрузить баннер'}
              >
                {draft.garageBanner ? (
                  <img alt="Превью баннера" src={draft.garageBanner} />
                ) : (
                  <span className="garageSettings__thumbEmpty">Широкое фото шапки · нажмите</span>
                )}
              </button>
              {draft.garageBanner ? (
                <button
                  type="button"
                  className="btn garageSettings__mediaRemove"
                  data-variant="ghost"
                  onClick={() => setDraft((d) => ({ ...d, garageBanner: '' }))}
                >
                  Убрать баннер
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="row gap wrap historyFormActions" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={async () => {
              const slug = normalizeGarageSlugInput(draft.garageSlug)
              try {
                await r.updateOwnerMe({
                  name: draft.name.trim(),
                  phone: draft.phone.trim(),
                  garageSlug: slug,
                  showPhonePublic: draft.showPhonePublic,
                  garageBanner: draft.garageBanner,
                  garageAvatar: draft.garageAvatar,
                })
                invalidateRepo()
                bumpSessionRefresh()
                navigate('/garage', { replace: true })
              } catch {
                alert('Не удалось сохранить. Возможно, адрес страницы уже занят.')
              }
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
