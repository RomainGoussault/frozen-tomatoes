// Small footer with data source + methodology note.

import { useT } from '@/lib/i18n'

export function Footer() {
  const { t } = useT()
  return (
    <footer className="text-muted-foreground mx-auto max-w-2xl px-4 pb-12 pt-4 text-center text-xs leading-relaxed">
      <p>
        {t('Data:')}{' '}
        <a
          href="https://open-meteo.com/en/docs/historical-weather-api"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {t('Open-Meteo (ERA5 reanalysis, ~9km grid)')}
        </a>
        {' · '}
        <a
          href="https://github.com/RomainGoussault/frozen-tomatoes"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {t('Source')}
        </a>
      </p>
      <p className="mt-1">
        {t('Probability = share of years with last frost after the selected date.')}
      </p>
    </footer>
  )
}
