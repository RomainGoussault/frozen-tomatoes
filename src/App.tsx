import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    try {
      setStatus({ kind: 'loading', step: 'geocoding' })
      const city = await geocodeCity(trimmed)
      if (!city) {
        setStatus({ kind: 'not-found' })
        return
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
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return (
    <main className="min-h-svh flex flex-col items-center gap-8 p-6 pt-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          frozen tomatoes
        </h1>
        <p className="text-muted-foreground max-w-md">
          Last frost dates for French cities, so you know when to plant.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
        <Input
          placeholder="Nantes, Lyon, Strasbourg…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={status.kind === 'loading'}>
          {status.kind === 'loading' ? 'Loading…' : 'Search'}
        </Button>
      </form>

      <ResultPanel status={status} />
    </main>
  )
}

function ResultPanel({ status }: { status: Status }) {
  if (status.kind === 'idle' || status.kind === 'loading') return null

  if (status.kind === 'error') {
    return <p className="text-destructive text-sm">{status.message}</p>
  }

  if (status.kind === 'not-found') {
    return <p className="text-muted-foreground text-sm">No city found.</p>
  }

  const { city, stats } = status.result
  return <StatsCard city={city} stats={stats} />
}

function StatsCard({
  city,
  stats,
}: {
  city: GeocodedCity
  stats: FrostStats
}) {
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

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>
          {city.name}
          {city.admin1 ? `, ${city.admin1}` : ''}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {START_YEAR}–{END_YEAR} · last frost before July 1
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Average" value={formatMonthDay(stats.averageDate)} />
          <Stat label="Median" value={formatMonthDay(stats.medianDate)} />
          <Stat label="Latest ever" value={formatMonthDay(stats.latestDate)} />
        </div>

        <FrostChart stats={stats} markerDoy={selectedDoy} />

        <div className="space-y-3 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">
              Chance of frost after{' '}
              <span className="text-foreground font-medium">
                {formatMonthDay(doyToMonthDay(selectedDoy))}
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
          {stats.yearsWithFrost} of {stats.yearsWithFrost + stats.yearsWithoutFrost} years had frost before July
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

/** Display "05-12" as "May 12". */
function formatMonthDay(mmdd: string | null): string {
  if (!mmdd) return '—'
  const [mm, dd] = mmdd.split('-')
  const date = new Date(Date.UTC(2001, Number(mm) - 1, Number(dd)))
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default App
