import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BackNav, Button, Card, Field, Input, Pill, Textarea } from '../components.jsx'
import { bumpSessionRefresh } from '../auth.js'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import { DETAILING_SERVICES, MAINTENANCE_SERVICES } from '../../lib/serviceCatalogs.js'
import { formatHttpErrorMessage } from '../../api/http.js'

export default function DetailingSettingsPage() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, mode, detailing, loading } = useDetailing()
  const [carsCount, setCarsCount] = useState(0)

  const [draft, setDraft] = useState(() => ({
    name: '',
    contactName: '',
    servicesOffered: [],
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
  useEffect(() => {
    if (!detailing) return
    setDraft({
      name: detailing.name || '',
      contactName: detailing.contactName || '',
      servicesOffered: Array.isArray(detailing.servicesOffered) ? detailing.servicesOffered : [],
      phone: detailing.phone || '',
      city: detailing.city || '',
      address: detailing.address || '',
      description: detailing.description || '',
      website: detailing.website || '',
      telegram: detailing.telegram || '',
      instagram: detailing.instagram || '',
      logo: detailing.logo || '',
      cover: detailing.cover || '',
    })
  }, [detailing])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (mode !== 'detailing' || !detailingId) return
      try {
        const list = await r.listCars()
        if (!cancelled) setCarsCount(Array.isArray(list) ? list.length : 0)
      } catch {
        if (!cancelled) setCarsCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, detailingId, r, r._version])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (loading) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (!detailing) return <Navigate to="/cars" replace />
  const initials = String(draft.name || detailing.name || 'Д').trim().slice(0, 2).toUpperCase()
  const addressText = [draft.city, draft.address].filter(Boolean).join(', ')
  const phoneDigits = String(draft.phone || '').replace(/[^\d+]/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : ''

  function toggleService(item) {
    const v = String(item || '').trim()
    if (!v) return
    setDraft((d) => {
      const cur = Array.isArray(d.servicesOffered) ? d.servicesOffered : []
      const has = cur.includes(v)
      const next = has ? cur.filter((x) => x !== v) : [...cur, v]
      return { ...d, servicesOffered: next }
    })
  }

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Лендинг</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              Настройки лендинга
            </h1>
          </div>
          <p className="muted">
            Здесь задаётся публичная страница по ссылке <strong>/d/…</strong>: что увидят клиенты до визита. Кабинет подтягивает те же
            название, обложку и логотип для узнаваемости.
          </p>
          {detailing.profileCompleted === false ? (
            <p className="muted small" style={{ marginTop: 10 }}>
              <strong>Первый вход:</strong> заполните лендинг и нажмите «Сохранить» — откроется кабинет со списком авто на обслуживании.
            </p>
          ) : null}
        </div>
      </div>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="cardTitle" style={{ marginBottom: 10 }}>
          Предпросмотр лендинга (как увидят клиенты)
        </div>
        <div
          className="detHero detHero--card"
          style={draft.cover ? { backgroundImage: `url("${String(draft.cover).replaceAll('"', '%22')}")` } : undefined}
        >
          <div className="detHero__overlay detHero__overlay--card">
            {draft.logo ? (
              <div className="detHero__logo detHero__logo--card">
                <img alt="Логотип" src={draft.logo} />
              </div>
            ) : (
              <div className="detHero__logo detHero__logo--card">
                <span aria-hidden="true">{initials}</span>
              </div>
            )}
            <div className="detHero__bottomRow">
              <div className="row gap wrap carHero__pills detHero__pills detHero__pills--right">
                <Pill tone="accent">Авто на обслуживании: {carsCount}</Pill>
                {Array.isArray(draft.servicesOffered) && draft.servicesOffered.length ? (
                  <Pill>{`Услуг: ${draft.servicesOffered.length}`}</Pill>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="topBorder">
          <div className="row spread gap" style={{ alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div className="h2" style={{ margin: 0 }}>
                {draft.name || 'Название студии / СТО'}
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                {addressText || 'Город и адрес'}
              </p>
              {draft.description ? (
                <p className="muted small" style={{ marginTop: 8, lineHeight: 1.55 }}>
                  {draft.description}
                </p>
              ) : (
                <p className="muted small" style={{ marginTop: 8 }}>
                  Добавьте описание — чем вы занимаетесь, режим работы, гарантия, подход.
                </p>
              )}
            </div>
            {draft.phone ? (
              <a className="btn" data-variant="primary" href={phoneHref} style={{ whiteSpace: 'nowrap' }}>
                Позвонить
              </a>
            ) : null}
          </div>
          {Array.isArray(draft.servicesOffered) && draft.servicesOffered.length ? (
            <div className="row gap wrap" style={{ marginTop: 10 }}>
              {draft.servicesOffered.slice(0, 10).map((s) => (
                <Pill key={s}>{s}</Pill>
              ))}
              {draft.servicesOffered.length > 10 ? <Pill>+ ещё</Pill> : null}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="topBorder" style={{ borderTop: 0, paddingTop: 0 }}>
          <p className="muted small" style={{ margin: '0 0 14px' }}>
            Логотип и обложка видны на публичной странице и в шапке кабинета.
          </p>
          <MediaBannerAvatarBlock
            variant="detailing"
            title="Внешний вид лендинга"
            avatarLabel="Логотип"
            bannerLabel="Обложка кабинета"
            bannerUrl={draft.cover}
            avatarUrl={draft.logo}
            onBannerUrl={(url) => setDraft((d) => ({ ...d, cover: url }))}
            onAvatarUrl={(url) => setDraft((d) => ({ ...d, logo: url }))}
            avatarEmptyHint="Нажмите для загрузки"
            bannerEmptyHint="Нажмите — широкое фото: фасад, зал или работа"
            avatarRemoveLabel="Убрать логотип"
            bannerRemoveLabel="Убрать обложку"
          />
        </div>

        <div className="topBorder">
          <div className="cardTitle" style={{ marginBottom: 8 }}>
            Текст и контакты на лендинге
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Название, адрес, телефон, услуги и ссылки — как на публичной странице по ссылке для клиентов.
          </p>
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
          <Field label="Контактное лицо" hint="Как обращаться к представителю сервиса">
            <Input
              className="input"
              value={draft.contactName}
              onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
              placeholder="Имя"
              autoComplete="name"
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
          <div className="field field--full">
            <div className="field__top">
              <span className="field__label">Услуги</span>
              <span className="field__hint">детейлинг и ТО — что делаете (появится на лендинге)</span>
            </div>
            <p className="muted small" style={{ margin: '0 0 8px' }}>
              Детейлинг
            </p>
            <div className="svc svc--compact">
              {DETAILING_SERVICES.map((g) => {
                const items = Array.isArray(g.items) ? g.items : []
                const selected = items.filter((x) => draft.servicesOffered.includes(x)).length
                return (
                  <details key={`d-${g.group}`} className="svc__group" open={selected > 0}>
                    <summary className="svc__title">
                      <span>{g.group}</span>
                      <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                    </summary>
                    <div className="svc__grid">
                      {items.map((it) => {
                        const checked = draft.servicesOffered.includes(it)
                        return (
                          <label key={it} className="svc__item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(it)}
                            />
                            <span>{it}</span>
                          </label>
                        )
                      })}
                    </div>
                  </details>
                )
              })}
            </div>
            <p className="muted small" style={{ margin: '14px 0 8px' }}>
              ТО и ремонт
            </p>
            <div className="svc svc--compact">
              {MAINTENANCE_SERVICES.map((g) => {
                const items = Array.isArray(g.items) ? g.items : []
                const selected = items.filter((x) => draft.servicesOffered.includes(x)).length
                return (
                  <details key={`m-${g.group}`} className="svc__group" open={selected > 0}>
                    <summary className="svc__title">
                      <span>{g.group}</span>
                      <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                    </summary>
                    <div className="svc__grid">
                      {items.map((it) => {
                        const checked = draft.servicesOffered.includes(it)
                        return (
                          <label key={it} className="svc__item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(it)}
                            />
                            <span>{it}</span>
                          </label>
                        )
                      })}
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
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
            onClick={async () => {
              if (!String(draft.name || '').trim()) {
                alert('Укажите название')
                return
              }
              if (!String(draft.phone || '').trim()) {
                alert('Укажите телефон')
                return
              }
              if (!String(draft.city || '').trim()) {
                alert('Укажите город')
                return
              }
              if (!Array.isArray(draft.servicesOffered) || draft.servicesOffered.length === 0) {
                alert('Выберите хотя бы одну услугу')
                return
              }
              try {
                await r.updateDetailingMe({ ...draft, profileCompleted: true })
                invalidateRepo()
                bumpSessionRefresh()
                nav('/detailing', { replace: true })
              } catch (e) {
                alert(formatHttpErrorMessage(e, 'Не удалось сохранить настройки.'))
              }
            }}
          >
            Сохранить
          </Button>
        </div>
      </Card>
    </div>
  )
}

