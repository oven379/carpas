import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BackNav, Button, Card, Field, Input, Textarea } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'

export default function DetailingSettingsPage() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, mode } = useDetailing()

  const detailing = useMemo(() => {
    if (!detailingId) return null
    return r.getDetailing?.(detailingId) || null
  }, [r, detailingId])

  const [draft, setDraft] = useState(() => ({
    name: '',
    phone: '',
    city: '',
    address: '',
    description: '',
    website: '',
    telegram: '',
    instagram: '',
    logo: '',
    cover: '',
  }))
  const logoRef = useRef(null)
  const coverRef = useRef(null)

  useEffect(() => {
    if (!detailingId) return
    const d = r.getDetailing?.(detailingId)
    if (!d) return
    setDraft({
      name: d.name || '',
      phone: d.phone || '',
      city: d.city || '',
      address: d.address || '',
      description: d.description || '',
      website: d.website || '',
      telegram: d.telegram || '',
      instagram: d.instagram || '',
      logo: d.logo || '',
      cover: d.cover || '',
    })
  }, [detailingId, r])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (!detailing) return <Navigate to="/cars" replace />

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Настройки</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              Настройки детейлинга / СТО
            </h1>
          </div>
          <p className="muted">
            Эти данные используются в кабинете и при отображении сервиса клиентам.
          </p>
          {detailing.profileCompleted === false ? (
            <p className="muted small" style={{ marginTop: 10 }}>
              <strong>Первый вход:</strong> заполните профиль и нажмите «Сохранить» — после этого откроется кабинет со списком авто
              на обслуживании у вашего детейлинга.
            </p>
          ) : null}
        </div>
      </div>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="topBorder" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="cardTitle" style={{ marginBottom: 10 }}>
            Внешний вид
          </div>
          <div className="formGrid">
            <Field label="Логотип" hint="PNG/JPG, квадрат лучше всего">
              <div className="row gap wrap">
                <input
                  ref={logoRef}
                  className="srOnly"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    try {
                      const url = await compressImageFile(file, {
                        maxW: 360,
                        maxH: 360,
                        quality: 0.86,
                        maxBytes: 512 * 1024,
                      })
                      setDraft((d) => ({ ...d, logo: url }))
                    } catch {
                      alert('Не удалось прочитать файл')
                    }
                  }}
                />
                <button type="button" className="btn" data-variant="outline" onClick={() => logoRef.current?.click?.()}>
                  {draft.logo ? 'Заменить логотип' : 'Загрузить логотип'}
                </button>
                {draft.logo ? (
                  <button type="button" className="btn" data-variant="ghost" onClick={() => setDraft((d) => ({ ...d, logo: '' }))}>
                    Убрать
                  </button>
                ) : null}
              </div>
              {draft.logo ? (
                <div className="detLogoPreview" style={{ marginTop: 10 }}>
                  <img alt="Логотип" src={draft.logo} />
                </div>
              ) : null}
            </Field>

            <Field label="Обложка кабинета" hint="широкая картинка, например фасад/зал">
              <div className="row gap wrap">
                <input
                  ref={coverRef}
                  className="srOnly"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    try {
                      const url = await compressImageFile(file, {
                        maxW: 1400,
                        maxH: 700,
                        quality: 0.82,
                        maxBytes: 1024 * 1024,
                      })
                      setDraft((d) => ({ ...d, cover: url }))
                    } catch {
                      alert('Не удалось прочитать файл')
                    }
                  }}
                />
                <button type="button" className="btn" data-variant="outline" onClick={() => coverRef.current?.click?.()}>
                  {draft.cover ? 'Заменить обложку' : 'Загрузить обложку'}
                </button>
                {draft.cover ? (
                  <button type="button" className="btn" data-variant="ghost" onClick={() => setDraft((d) => ({ ...d, cover: '' }))}>
                    Убрать
                  </button>
                ) : null}
              </div>
              <div className="detCoverPreview" style={{ marginTop: 10, backgroundImage: draft.cover ? `url("${String(draft.cover).replaceAll('"', '%22')}")` : undefined }}>
                {!draft.cover ? <div className="muted small">Обложка не задана</div> : null}
              </div>
            </Field>
          </div>
        </div>

        <div className="formGrid">
          <Field label="Название">
            <Input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Название студии / СТО"
              autoComplete="organization"
            />
          </Field>
          <Field label="Телефон">
            <Input
              className="input"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="+7 …"
              autoComplete="tel"
            />
          </Field>
          <Field label="Город">
            <Input
              className="input"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Например: Москва"
              autoComplete="address-level2"
            />
          </Field>
          <Field label="Адрес" hint="необязательно">
            <Input
              className="input"
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Улица, дом"
              autoComplete="street-address"
            />
          </Field>
          <Field className="field--full" label="Описание" hint="необязательно">
            <Textarea
              className="textarea"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Коротко: чем занимаетесь, режим работы, гарантия…"
            />
          </Field>
          <Field label="Сайт" hint="необязательно">
            <Input
              className="input"
              value={draft.website}
              onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
              placeholder="https://…"
              inputMode="url"
            />
          </Field>
          <Field label="Telegram" hint="необязательно">
            <Input
              className="input"
              value={draft.telegram}
              onChange={(e) => setDraft((d) => ({ ...d, telegram: e.target.value }))}
              placeholder="@username или ссылка"
            />
          </Field>
          <Field label="Instagram" hint="необязательно">
            <Input
              className="input"
              value={draft.instagram}
              onChange={(e) => setDraft((d) => ({ ...d, instagram: e.target.value }))}
              placeholder="@username или ссылка"
            />
          </Field>
        </div>

        <div className="row gap topBorder">
          <Button
            className="btn"
            variant="primary"
            onClick={() => {
              const saved = r.updateDetailing?.(
                detailingId,
                { ...draft, profileCompleted: true },
                { detailingId },
              )
              if (!saved) {
                alert('Не удалось сохранить настройки (нет доступа).')
                return
              }
              invalidateRepo()
              nav('/detailing', { replace: true })
            }}
          >
            Сохранить
          </Button>
        </div>
      </Card>
    </div>
  )
}

