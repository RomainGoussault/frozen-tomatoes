// Small fixed top-right controls: nav link + language toggle + theme toggle.

import { Map as MapIcon, Moon, Sun, ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'
import { useT } from '@/lib/i18n'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useT()
  const { pathname } = useLocation()
  const onMap = pathname === '/map'

  return (
    <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link
          to={onMap ? '/' : '/map'}
          aria-label={onMap ? t('Home') : t('Map')}
        >
          {onMap ? (
            <>
              <ArrowLeft className="size-4" /> {t('Home')}
            </>
          ) : (
            <>
              <MapIcon className="size-4" /> {t('Map')}
            </>
          )}
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        aria-label="Toggle language"
        className="text-xs font-medium uppercase"
      >
        {lang === 'fr' ? 'EN' : 'FR'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </Button>
    </div>
  )
}
