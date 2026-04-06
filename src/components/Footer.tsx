// Small footer with data source + methodology note.
// On the /map route, shows a prefecture note instead of the probability explanation.

import { useLocation } from 'react-router'
import { useT } from '@/lib/i18n'

export function Footer() {
  const { t } = useT()
  const { pathname } = useLocation()
  const isMap = pathname === '/map'

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
        {isMap
          ? t('Each département shows data from its préfecture.')
          : t('Probability = share of years with last frost after the selected date.')}
      </p>
    </footer>
  )
}
