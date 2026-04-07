import { HOME_ABOUT_LEAD } from './homeLandingAboutCopy.js'
import { HOME_TITLE } from '../seo/seoConstants.js'

/** Событие после сохранения черновика (тот же браузер). */
export const MARKETING_LANDING_UPDATED = 'carPass:marketingLandingDraft'

export const MARKETING_LANDING_STORAGE_KEY = 'carPass_marketingLandingV1'

const DEFAULT_INFO_PURPOSE = 'История обслуживания автомобиля в вашем телефоне'
const DEFAULT_INFO_AUDIENCE = 'Владельцы авто, детейлинг студии, СТО'
const DEFAULT_GARAGES_HINT =
  'Примеры авто с фото с визитов — только там, где владелец разрешил показ снимков. Карточка открывает профиль сервиса.'

export function defaultMarketingLanding() {
  return {
    heroTitle: HOME_TITLE,
    heroLead: HOME_ABOUT_LEAD,
    /** Необязательная вторая строка под H1; слоган под логотипом — BRAND_TAGLINE в коде */
    bannerTagline: '',
    /** Фон баннера: URL или data URL; пусто — стандартный фон как сейчас */
    bannerImageUrl: '',
    /** Картинка вместо логотипа в баннере; пусто — SVG Logo */
    bannerLogoUrl: '',
    /** Картинка в блоке «Информация» справа; пусто — SVG Logo */
    infoCardLogoUrl: '',
    infoSectionTitle: 'Информация:',
    infoPurpose: DEFAULT_INFO_PURPOSE,
    infoAudience: DEFAULT_INFO_AUDIENCE,
    featuresTitle: 'Возможности',
    /** По одному пункту на строку; пусто — встроенный список на главной */
    featureLines: '',
    startSectionTitle: 'Начать свою историю',
    startSectionLead: 'Войдите или зарегистрируйтесь — кабинет владельца или партнёра.',
    faqSectionTitle: 'Часто задаваемые вопросы',
    garagesSectionTitle: 'Гаражи:',
    garagesSectionHint: DEFAULT_GARAGES_HINT,
  }
}

function mergeLanding(raw) {
  const d = defaultMarketingLanding()
  if (!raw || typeof raw !== 'object') return d

  const str = (k, fallback) => {
    const v = raw[k]
    return typeof v === 'string' ? v : fallback
  }

  const strOrDefault = (k, fallback) => {
    const v = str(k, fallback)
    const t = v.trim()
    return t || fallback
  }

  const urlOrEmpty = (k) => {
    const v = str(k, '')
    const t = v.trim()
    if (!t) return ''
    if (t.startsWith('data:image/')) return t
    if (/^https?:\/\//i.test(t)) return t
    return ''
  }

  return {
    heroTitle: strOrDefault('heroTitle', d.heroTitle),
    heroLead: strOrDefault('heroLead', d.heroLead),
    bannerTagline: str('bannerTagline', d.bannerTagline),
    bannerImageUrl: urlOrEmpty('bannerImageUrl'),
    bannerLogoUrl: urlOrEmpty('bannerLogoUrl'),
    infoCardLogoUrl: urlOrEmpty('infoCardLogoUrl'),
    infoSectionTitle: strOrDefault('infoSectionTitle', d.infoSectionTitle),
    infoPurpose: strOrDefault('infoPurpose', d.infoPurpose),
    infoAudience: strOrDefault('infoAudience', d.infoAudience),
    featuresTitle: strOrDefault('featuresTitle', d.featuresTitle),
    featureLines: str('featureLines', ''),
    startSectionTitle: strOrDefault('startSectionTitle', d.startSectionTitle),
    startSectionLead: strOrDefault('startSectionLead', d.startSectionLead),
    faqSectionTitle: strOrDefault('faqSectionTitle', d.faqSectionTitle),
    garagesSectionTitle: strOrDefault('garagesSectionTitle', d.garagesSectionTitle),
    garagesSectionHint: strOrDefault('garagesSectionHint', d.garagesSectionHint),
  }
}

export function readMarketingLanding() {
  try {
    const raw = localStorage.getItem(MARKETING_LANDING_STORAGE_KEY)
    if (!raw) return defaultMarketingLanding()
    const o = JSON.parse(raw)
    return mergeLanding(o)
  } catch {
    return defaultMarketingLanding()
  }
}

/** Сохранить черновик главной (localStorage). */
export function persistMarketingLanding(values) {
  const v = values && typeof values === 'object' ? values : {}
  const flat = Object.fromEntries(
    Object.entries(v).map(([key, val]) => [key, val == null ? '' : String(val)]),
  )
  const payload = mergeLanding({ ...defaultMarketingLanding(), ...flat })
  localStorage.setItem(MARKETING_LANDING_STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(MARKETING_LANDING_UPDATED))
}

export function resetMarketingLanding() {
  localStorage.removeItem(MARKETING_LANDING_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(MARKETING_LANDING_UPDATED))
}
