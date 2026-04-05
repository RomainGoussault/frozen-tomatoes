import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  geocodeCity,
  fetchDailyMinTemps,
  type GeocodedCity,
} from '@/lib/openmeteo'
import { Slider } from '@/components/ui/slider'
import {
  computeFrostStats,
  probabilityOfFrostAfter,
  doyToMonthDay,
  type FrostStats,
} from '@/lib/stats'
import { FrostChart } from '@/components/FrostChart'
import { CitySearch } from '@/components/CitySearch'
import { Header } from '@/components/Header'
import { useT, toLocale } from '@/lib/i18n'

type Result = { city: GeocodedCity; stats: FrostStats }

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; step: 'geocoding' | 'fetching' | 'computing' }
  | { kind: 'error'; message: string }
  | { kind: 'not-found' }
  | { kind: 'success'; result: Result }

// Fetch window: last 20 complete years.
const END_YEAR = new Date().getFullYear() - 1
const START_YEAR = END_YEAR - 19

function App() {
  const { t } = useT()
  // Initial query is read from ?city= once, on mount. The function form
  // of useState is a "lazy initializer" — it runs exactly once.
  const [query, setQuery] = useState(() => getUrlCity() ?? '')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  // Core search: runs the full pipeline. Accepts either a raw city name
  // (will be geocoded) or a pre-geocoded city (from the autocomplete).
  const runSearch = useCallback(async (choice: string | GeocodedCity) => {
    try {
      let city: GeocodedCity | null
      if (typeof choice === 'string') {
        const trimmed = choice.trim()
        if (!trimmed) return
        setStatus({ kind: 'loading', step: 'geocoding' })
        city = await geocodeCity(trimmed)
        if (!city) {
          setStatus({ kind: 'not-found' })
          setUrlCity(null)
          return
        }
      } else {
        city = choice
      }

      setStatus({ kind: 'loading', step: 'fetching' })
      const days = await fetchDailyMinTemps(
        city.latitude,
        city.longitude,
        `${START_YEAR}-01-01`,
        `${END_YEAR}-12-31`,
      )

      setStatus({ kind: 'loading', step: 'computing' })
      const stats = computeFrostStats(days)
      setStatus({ kind: 'success', result: { city, stats } })
      setUrlCity(city.name)
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [])

  // On first mount: if ?city=... was in the URL (already reflected in
  // `query` via the lazy initializer), kick off the async search. The
  // rule warns because runSearch sets state, but "fetch on mount" is
  // a legitimate effect pattern.
  useEffect(() => {
    const fromUrl = getUrlCity()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromUrl) runSearch(fromUrl)
  }, [runSearch])

  return (
    <>
      <Header />
      <main className="min-h-svh flex flex-col items-center gap-8 p-6 pt-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            frozen tomatoes
          </h1>
          <p className="text-muted-foreground max-w-md">
            {t('Last frost dates for French cities, so you know when to plant.')}
          </p>
        </header>

        <CitySearch
          value={query}
          onValueChange={setQuery}
          onSelect={runSearch}
          disabled={status.kind === 'loading'}
        />

        <ResultPanel status={status} />
      </main>
    </>
  )
}

function ResultPanel({ status }: { status: Status }) {
  const { t } = useT()
  if (status.kind === 'idle' || status.kind === 'loading') return null

  if (status.kind === 'error') {
    return <p className="text-destructive text-sm">{status.message}</p>
  }

  if (status.kind === 'not-found') {
    return <p className="text-muted-foreground text-sm">{t('No city found.')}</p>
  }

  const { city, stats } = status.result
  return <StatsCard city={city} stats={stats} />
}

export function StatsCard({
  city,
  stats,
}: {
  city: GeocodedCity
  stats: FrostStats
}) {
  const { t, lang } = useT()
  const locale = toLocale(lang)

  // Slider range: bracket the observed data with some padding, clamped.
  const observedDoys = stats.perYear
    .map((y) => y.dayOfYear)
    .filter((d): d is number => d !== null)
  const sliderMin = Math.max(1, Math.min(...observedDoys) - 10)
  const sliderMax = Math.min(365, Math.max(...observedDoys) + 10)

  // Initial slider position: the average, or the mid-range as a fallback.
  const initialDoy =
    stats.averageDayOfYear ?? Math.round((sliderMin + sliderMax) / 2)
  const [selectedDoy, setSelectedDoy] = useState(initialDoy)

  const probability = probabilityOfFrostAfter(stats, selectedDoy)
  const totalYears = stats.yearsWithFrost + stats.yearsWithoutFrost

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>
          {city.name}
          {city.admin2 ? `, ${city.admin2}` : city.admin1 ? `, ${city.admin1}` : ''}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {START_YEAR}–{END_YEAR} · {t('last frost before July 1')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label={t('Average')} value={formatMonthDay(stats.averageDate, locale)} />
          <Stat label={t('Median')} value={formatMonthDay(stats.medianDate, locale)} />
          <Stat label={t('Latest ever')} value={formatMonthDay(stats.latestDate, locale)} />
        </div>

        <FrostChart stats={stats} markerDoy={selectedDoy} />

        <div className="space-y-3 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">
              {t('Chance of frost after')}{' '}
              <span className="text-foreground font-medium">
                {formatMonthDay(doyToMonthDay(selectedDoy), locale)}
              </span>
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {probability === null ? '—' : `${Math.round(probability * 100)}%`}
            </span>
          </div>
          <Slider
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={[selectedDoy]}
            onValueChange={([v]) => setSelectedDoy(v)}
          />
        </div>

        <p className="text-muted-foreground text-xs text-center">
          {t('X of Y years had frost before July', {
            withFrost: stats.yearsWithFrost,
            total: totalYears,
          })}
        </p>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-medium">{value}</span>
    </div>
  )
}

/** Display "05-12" as "May 12" (en) or "12 mai" (fr). */
function formatMonthDay(mmdd: string | null, locale: string): string {
  if (!mmdd) return '—'
  const [mm, dd] = mmdd.split('-')
  const date = new Date(Date.UTC(2001, Number(mm) - 1, Number(dd)))
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// ---------- URL state helpers ----------

/** Read the `city` query param from the current URL, or null. */
function getUrlCity(): string | null {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('city')
  return value && value.trim() ? value : null
}

/** Write `?city=...` into the URL without reloading the page. Pass null to clear. */
function setUrlCity(city: string | null): void {
  const url = new URL(window.location.href)
  if (city) {
    url.searchParams.set('city', city)
  } else {
    url.searchParams.delete('city')
  }
  window.history.replaceState(null, '', url)
}

export default App
