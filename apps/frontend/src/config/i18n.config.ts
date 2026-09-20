import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enAuth from '../../public/locales/en/auth.json'
import enChat from '../../public/locales/en/chat.json'
import enCommon from '../../public/locales/en/common.json'
import enErrors from '../../public/locales/en/errors.json'
import enProfile from '../../public/locales/en/profile.json'
import faAuth from '../../public/locales/fa/auth.json'
import faChat from '../../public/locales/fa/chat.json'
import faCommon from '../../public/locales/fa/common.json'
import faErrors from '../../public/locales/fa/errors.json'
import faProfile from '../../public/locales/fa/profile.json'

/** Languages supported by the application (stack.md §11: Persian + English). */
export const SUPPORTED_LOCALES = ['en', 'fa'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Default language, matching the codebase's English-first convention. */
export const DEFAULT_LOCALE: Locale = 'en'

/** Translation namespaces (architecture.md: public/locales/{en,fa}/...). */
export const LOCALE_NAMESPACES = ['common', 'auth', 'chat', 'errors', 'profile'] as const

export type LocaleNamespace = (typeof LOCALE_NAMESPACES)[number]

export interface LocaleMeta {
  /** Human-readable label shown in the language switcher. */
  label: string
  /** Base direction for the locale's script. */
  dir: 'ltr' | 'rtl'
  /** BCP-47 locale passed to Intl formatting APIs. */
  intl: string
}

/** Per-locale metadata used for document direction and Intl formatting. */
export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { label: 'English', dir: 'ltr', intl: 'en-US' },
  fa: { label: 'فارسی', dir: 'rtl', intl: 'fa-IR' },
}

/** Translation resources, loaded synchronously from the locale JSON files. */
export const resources: Record<Locale, Record<LocaleNamespace, object>> = {
  en: { common: enCommon, auth: enAuth, chat: enChat, errors: enErrors, profile: enProfile },
  fa: { common: faCommon, auth: faAuth, chat: faChat, errors: faErrors, profile: faProfile },
}

/**
 * The shared i18next instance. Resources are bundled with the app, so init
 * resolves without any backend/fetch and both SSR and the first client render
 * have every namespace available.
 */
i18n.use(initReactI18next).init({
  resources,
  // Always start English so SSR and the first client render agree exactly;
  // any persisted language is restored by I18nProvider after hydration.
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  ns: [...LOCALE_NAMESPACES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
