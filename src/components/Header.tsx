// Small top-right controls: theme toggle + language toggle.

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'
import { useT } from '@/lib/i18n'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang } = useT()

  return (
    <div className="fixed right-4 top-4 flex items-center gap-2">
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
