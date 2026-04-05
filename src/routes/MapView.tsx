// Route: /map — interactive map of France colored by median last-frost date.

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { FranceMap } from '@/components/FranceMap'
import { useT } from '@/lib/i18n'

type MapData = {
  generatedAt: string
  startYear: number
  endYear: number
  departments: Array<{
    code: string
    name: string
    prefecture: string
    lat: number
    lon: number
    averageDoy: number | null
    medianDoy: number | null
    latestDoy: number | null
    yearsWithFrost: number
    yearsWithoutFrost: number
    perYearDoys: (number | null)[]
  }>
}

export function MapView() {
  const { t } = useT()
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/map-data.json', { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json: MapData) => setData(json))
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
        }
      })
    return () => ctrl.abort()
  }, [])

  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-6 pt-24">
      <header className="flex flex-col items-center gap-2 text-center max-w-2xl">
        <h1 className="text-4xl font-light tracking-tight">
          {t('France, département by département')}
        </h1>
        {data && (
          <p className="text-muted-foreground text-sm">
            {data.startYear}–{data.endYear} · {t('median last frost')}
          </p>
        )}
      </header>

      {error && (
        <p className="text-destructive text-sm">
          {t('Could not load map data:')} {error}
        </p>
      )}

      {!data && !error && (
        <Skeleton className="h-[70vh] w-full max-w-4xl rounded-lg" />
      )}

      {data && <FranceMap mapData={data} />}
    </main>
  )
}
