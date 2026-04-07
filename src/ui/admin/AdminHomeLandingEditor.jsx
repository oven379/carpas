import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  readMarketingLanding,
  persistMarketingLanding,
  resetMarketingLanding,
} from '../../lib/marketingLandingDraft.js'
import { readImageFileAsDataUrl } from '../../lib/readImageFileAsDataUrl.js'
import { OPEN_SERVICE_ABOUT_STATE } from '../../lib/serviceLandingNav.js'
import { Card, Field, Input, Textarea } from '../components.jsx'

const BANNER_BG_MAX = 2 * 1024 * 1024
const LOGO_IMG_MAX = 800 * 1024

function loadFormState() {
  const L = readMarketingLanding()
  return {
    heroTitle: L.heroTitle,
    heroLead: L.heroLead,
    bannerTagline: L.bannerTagline,
    bannerImageUrl: L.bannerImageUrl,
    bannerLogoUrl: L.bannerLogoUrl,
    infoCardLogoUrl: L.infoCardLogoUrl,
    infoSectionTitle: L.infoSectionTitle,
    infoPurpose: L.infoPurpose,
    infoAudience: L.infoAudience,
    featuresTitle: L.featuresTitle,
    featureLines: L.featureLines,
    startSectionTitle: L.startSectionTitle,
    startSectionLead: L.startSectionLead,
    faqSectionTitle: L.faqSectionTitle,
    garagesSectionTitle: L.garagesSectionTitle,
    garagesSectionHint: L.garagesSectionHint,
  }
}

export default function AdminHomeLandingEditor() {
  const [form, setForm] = useState(() => loadFormState())
  const [savedHint, setSavedHint] = useState('')
  const [imgErr, setImgErr] = useState('')

  const pullFromStorage = () => setForm(loadFormState())

  const setF = (key) => (e) => {
    const v = e.target.value
    setForm((s) => ({ ...s, [key]: v }))
  }

  const onImagePick = (key, maxBytes) => async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setImgErr('')
    try {
      const dataUrl = await readImageFileAsDataUrl(f, maxBytes)
      setForm((s) => ({ ...s, [key]: dataUrl }))
    } catch (err) {
      setImgErr(err instanceof Error ? err.message : 'Не удалось загрузить файл.')
    }
  }

  const save = (e) => {
    e.preventDefault()
    persistMarketingLanding(form)
    setSavedHint('Сохранено. Откройте главную в новой вкладке или обновите страницу.')
    window.setTimeout(() => setSavedHint(''), 5000)
  }

  const reset = () => {
    resetMarketingLanding()
    pullFromStorage()
    setImgErr('')
    setSavedHint('Сброшено к оформлению и текстам по умолчанию.')
    window.setTimeout(() => setSavedHint(''), 5000)
  }

  return (
    <div className="adminPreview__stack">
      <Card className="card pad">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 8 }}>
          Главная страница (лендинг)
        </h2>
        <p className="muted small" style={{ margin: '0 0 16px', lineHeight: 1.45 }}>
          Настройки хранятся в браузере (localStorage) и сразу влияют на{' '}
          <Link className="link" to="/" state={OPEN_SERVICE_ABOUT_STATE}>
            главную
          </Link>
          . Пустые поля картинок — стандартный фон баннера и логотип КарПас (SVG). Для фона и логотипов можно вставить
          HTTPS-ссылку или загрузить файл (JPEG, PNG, WebP, GIF).
        </p>
        {imgErr ? (
          <p className="adminSupportErr small" role="alert" style={{ marginBottom: 12 }}>
            {imgErr}
          </p>
        ) : null}
        <form className="formGrid" onSubmit={save}>
          <h3 className="h3 adminPreview__panelTitle field--full" style={{ margin: '8px 0 0', fontSize: '1rem' }}>
            Верхний баннер
          </h3>
          <Field
            className="field--full"
            label="Фон баннера (URL)"
            hint="необязательно; иначе — сплошная заливка как сейчас"
          >
            <Input className="input" value={form.bannerImageUrl} onChange={setF('bannerImageUrl')} placeholder="https://…" />
          </Field>
          <div className="field field--full">
            <div className="field__top field__top--solo">
              <span className="field__label">Фон баннера — файл</span>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImagePick('bannerImageUrl', BANNER_BG_MAX)} />
            {form.bannerImageUrl ? (
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                style={{ marginTop: 8 }}
                onClick={() => setForm((s) => ({ ...s, bannerImageUrl: '' }))}
              >
                Убрать фон
              </button>
            ) : null}
          </div>
          <Field
            className="field--full"
            label="Картинка вместо логотипа в баннере (URL)"
            hint="необязательно; иначе — стандартный знак КарПас"
          >
            <Input className="input" value={form.bannerLogoUrl} onChange={setF('bannerLogoUrl')} placeholder="https://…" />
          </Field>
          <div className="field field--full">
            <div className="field__top field__top--solo">
              <span className="field__label">Логотип в баннере — файл</span>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImagePick('bannerLogoUrl', LOGO_IMG_MAX)} />
            {form.bannerLogoUrl ? (
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                style={{ marginTop: 8 }}
                onClick={() => setForm((s) => ({ ...s, bannerLogoUrl: '' }))}
              >
                Снова SVG по умолчанию
              </button>
            ) : null}
          </div>
          <Field className="field--full" label="Заголовок (H1) на баннере" hint="также в title страницы для SEO">
            <Input className="input" value={form.heroTitle} onChange={setF('heroTitle')} />
          </Field>
          <Field
            className="field--full"
            label="Дополнительная строка под H1"
            hint="необязательно; «История Вашего авто!» под логотипом задаётся в коде"
          >
            <Input className="input" value={form.bannerTagline} onChange={setF('bannerTagline')} placeholder="" />
          </Field>

          <h3 className="h3 adminPreview__panelTitle field--full" style={{ margin: '16px 0 0', fontSize: '1rem' }}>
            Блок «Информация»
          </h3>
          <Field className="field--full" label="Заголовок блока">
            <Input className="input" value={form.infoSectionTitle} onChange={setF('infoSectionTitle')} />
          </Field>
          <Field className="field--full" label="Назначение (правая колонка — первая строка)">
            <Input className="input" value={form.infoPurpose} onChange={setF('infoPurpose')} />
          </Field>
          <Field className="field--full" label="Для кого (вторая строка)">
            <Input className="input" value={form.infoAudience} onChange={setF('infoAudience')} />
          </Field>
          <Field
            className="field--full"
            label="Аватар в блоке (URL)"
            hint="квадрат справа; пусто — мини-логотип SVG"
          >
            <Input className="input" value={form.infoCardLogoUrl} onChange={setF('infoCardLogoUrl')} placeholder="https://…" />
          </Field>
          <div className="field field--full">
            <div className="field__top field__top--solo">
              <span className="field__label">Аватар в блоке — файл</span>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImagePick('infoCardLogoUrl', LOGO_IMG_MAX)} />
            {form.infoCardLogoUrl ? (
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                style={{ marginTop: 8 }}
                onClick={() => setForm((s) => ({ ...s, infoCardLogoUrl: '' }))}
              >
                Снова SVG по умолчанию
              </button>
            ) : null}
          </div>

          <h3 className="h3 adminPreview__panelTitle field--full" style={{ margin: '16px 0 0', fontSize: '1rem' }}>
            Блок «О сервисе» (лид)
          </h3>
          <Field className="field--full" label="Лид-абзац в раскрывающемся блоке">
            <Textarea
              className="input"
              rows={5}
              value={form.heroLead}
              onChange={setF('heroLead')}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </Field>

          <h3 className="h3 adminPreview__panelTitle field--full" style={{ margin: '16px 0 0', fontSize: '1rem' }}>
            Остальные секции
          </h3>
          <Field className="field--full" label="Заголовок «Возможности»">
            <Input className="input" value={form.featuresTitle} onChange={setF('featuresTitle')} />
          </Field>
          <Field
            className="field--full"
            label="Список возможностей"
            hint="одна строка — один пункт; пусто — встроенный список по умолчанию"
          >
            <Textarea
              className="input"
              rows={8}
              value={form.featureLines}
              onChange={setF('featureLines')}
              style={{ resize: 'vertical', minHeight: 160 }}
            />
          </Field>
          <Field className="field--full" label="Заголовок «Начать свою историю»">
            <Input className="input" value={form.startSectionTitle} onChange={setF('startSectionTitle')} />
          </Field>
          <Field className="field--full" label="Текст под заголовком «Начать…»">
            <Textarea
              className="input"
              rows={2}
              value={form.startSectionLead}
              onChange={setF('startSectionLead')}
              style={{ resize: 'vertical', minHeight: 56 }}
            />
          </Field>
          <Field className="field--full" label="Заголовок FAQ">
            <Input className="input" value={form.faqSectionTitle} onChange={setF('faqSectionTitle')} />
          </Field>
          <Field className="field--full" label="Заголовок блока гаражей">
            <Input className="input" value={form.garagesSectionTitle} onChange={setF('garagesSectionTitle')} />
          </Field>
          <Field className="field--full" label="Пояснение под заголовком гаражей">
            <Textarea
              className="input"
              rows={3}
              value={form.garagesSectionHint}
              onChange={setF('garagesSectionHint')}
              style={{ resize: 'vertical', minHeight: 72 }}
            />
          </Field>

          <div className="field--full row gap wrap" style={{ marginTop: 8 }}>
            <button type="submit" className="btn" data-variant="primary">
              Сохранить главную
            </button>
            <button type="button" className="btn" data-variant="outline" onClick={reset}>
              Сбросить всё по умолчанию
            </button>
          </div>
          {savedHint ? (
            <p className="muted small field--full" style={{ margin: 0 }}>
              {savedHint}
            </p>
          ) : null}
        </form>
      </Card>
      <Card className="card pad adminExplainCard">
        <h2 className="h2 adminPreview__panelTitle" style={{ marginBottom: 8 }}>
          Подсказка
        </h2>
        <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
          Дефолтные тексты заданы в <code className="adminMono">seoConstants.js</code>,{' '}
          <code className="adminMono">homeLandingAboutCopy.js</code> и{' '}
          <code className="adminMono">marketingLandingDraft.js</code>. Большие картинки в base64 увеличивают объём
          localStorage; для продакшена позже лучше вынести медиа на сервер/CDN.
        </p>
      </Card>
    </div>
  )
}
