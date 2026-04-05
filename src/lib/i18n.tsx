/* eslint-disable react-refresh/only-export-components */
// Tiny i18n: two languages, dictionary lookup, context-backed hook.
//
// We don't use a library (i18next, react-intl) because for two languages
// and ~20 strings the library overhead isn't worth it. This file is the
// whole i18n system: translations table + provider + hook.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Lang = 'fr' | 'en'

// All translatable strings. Keys are the English phrase (convention:
// readable keys beat abbreviated ones). Values for each language.
const translations = {
  'Last frost dates for French cities, so you know when to plant.': {
    fr: 'Dates de dernier gel pour les villes françaises, pour savoir quand planter.',
    en: 'Last frost dates for French cities, so you know when to plant.',
  },
  Search: { fr: 'Rechercher', en: 'Search' },
  'Loading…': { fr: 'Chargement…', en: 'Loading…' },
  'No city found.': { fr: 'Aucune ville trouvée.', en: 'No city found.' },
  Average: { fr: 'Moyenne', en: 'Average' },
  Median: { fr: 'Médiane', en: 'Median' },
  'Latest ever': { fr: 'Plus tardif', en: 'Latest ever' },
  'last frost before July 1': {
    fr: 'dernier gel avant le 1er juillet',
    en: 'last frost before July 1',
  },
  'Chance of frost after': {
    fr: 'Probabilité de gel après',
    en: 'Chance of frost after',
  },
  'No frost observed in the last 20 years.': {
    fr: 'Aucun gel observé ces 20 dernières années.',
    en: 'No frost observed in the last 20 years.',
  },
  avg: { fr: 'moy', en: 'avg' },
  // Uses {withFrost} and {total} placeholders, filled by t() caller.
  'X of Y years had frost before July': {
    fr: '{withFrost} années sur {total} ont connu un gel avant juillet',
    en: '{withFrost} of {total} years had frost before July',
  },
} as const

type TranslationKey = keyof typeof translations

type I18nContextValue = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'frozen-tomatoes.lang'

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'fr' || stored === 'en') return stored
  // Fall back to browser language — anything starting with "fr" → French,
  // everything else → English.
  const browser = window.navigator.language.toLowerCase()
  return browser.startsWith('fr') ? 'fr' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let out: string = translations[key][lang]
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            out = out.replace(`{${k}}`, String(v))
          }
        }
        return out
      },
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside <LangProvider>')
  return ctx
}

/** Maps app language to the BCP-47 tag for Intl APIs (date formatting etc.). */
export function toLocale(lang: Lang): string {
  return lang === 'fr' ? 'fr-FR' : 'en-US'
}
