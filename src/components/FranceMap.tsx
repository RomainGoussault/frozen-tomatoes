// Interactive map of France: department polygons colored by their
// median last-frost day-of-year. No basemap — just the data.
//
// Uses MapLibre GL JS. Loads two static sources:
//   - /departements.geojson  (polygon shapes, keyed by `code`)
//   - /map-data.json         (frost stats per department, keyed by code)
//
// The join is done at runtime inside MapLibre via a data-driven style
// expression: for each polygon feature, look up `code` in our data and
// map the resulting median-doy to a color.

import { useEffect, useRef, useState } from 'react'
import maplibregl, { type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router'
import { useT } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { colorForDoy, type ColorRange } from '@/lib/mapColors'

type DepartmentStats = {
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
}

type MapData = {
  generatedAt: string
  startYear: number
  endYear: number
  departments: DepartmentStats[]
}

type HoverInfo = {
  code: string
  name: string
  stats: DepartmentStats | null
  x: number
  y: number
}

export function FranceMap({ mapData }: { mapData: MapData }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const { theme } = useTheme()
  const navigate = useNavigate()
  // Keep navigate stable across effect re-runs via a ref.
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // Build a lookup: department code → stats.
  const byCode = new Map<string, DepartmentStats>()
  for (const d of mapData.departments) byCode.set(d.code, d)

  // Compute color range from the observed median-doys.
  const medians = mapData.departments
    .map((d) => d.medianDoy)
    .filter((d): d is number => d !== null)
  const range: ColorRange = {
    min: medians.length ? Math.min(...medians) : 40,
    max: medians.length ? Math.max(...medians) : 130,
  }

  useEffect(() => {
    if (!mapContainerRef.current) return

    // MapLibre style: no basemap tiles, just our polygon source + layers.
    const style: StyleSpecification = {
      version: 8,
      sources: {
        departments: {
          type: 'geojson',
          data: '/departements.geojson',
          promoteId: 'code',
        },
      },
      layers: [
        {
          id: 'bg',
          type: 'background',
          paint: {
            'background-color':
              theme === 'dark' ? 'rgb(22, 24, 28)' : 'rgb(253, 252, 249)',
          },
        },
        {
          id: 'dept-fill',
          type: 'fill',
          source: 'departments',
          paint: {
            'fill-color': buildFillExpression(byCode, range, theme),
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              1,
              0.92,
            ],
          },
        },
        {
          id: 'dept-border',
          type: 'line',
          source: 'departments',
          paint: {
            'line-color':
              theme === 'dark' ? 'rgb(40, 44, 50)' : 'rgb(230, 228, 222)',
            'line-width': 0.6,
          },
        },
        {
          id: 'dept-border-hover',
          type: 'line',
          source: 'departments',
          paint: {
            'line-color':
              theme === 'dark' ? 'rgb(230, 228, 222)' : 'rgb(40, 44, 50)',
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              2.5,
              0,
            ],
          },
        },
      ],
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style,
      center: [2.5, 46.5], // roughly middle of France
      zoom: 4.8,
      minZoom: 4.2,
      maxZoom: 7,
      attributionControl: false,
      interactive: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: false,
    })
    mapRef.current = map

    map.on('load', () => {
      // Constrain panning to keep France in view.
      map.setMaxBounds([
        [-8, 40], // SW
        [13, 53], // NE
      ])
    })

    // Hover state: highlight the active department.
    let hoveredId: string | number | null = null

    map.on('mousemove', 'dept-fill', (e) => {
      if (!e.features || e.features.length === 0) return
      const feature = e.features[0]
      const id = feature.id as string
      const code = id // promoteId: 'code' means feature.id === code

      if (hoveredId !== null && hoveredId !== id) {
        map.setFeatureState(
          { source: 'departments', id: hoveredId },
          { hover: false },
        )
      }
      hoveredId = id
      map.setFeatureState({ source: 'departments', id }, { hover: true })
      map.getCanvas().style.cursor = 'pointer'

      const stats = byCode.get(code) ?? null
      setHover({
        code,
        name: (feature.properties?.nom as string) ?? code,
        stats,
        x: e.point.x,
        y: e.point.y,
      })
    })

    map.on('mouseleave', 'dept-fill', () => {
      if (hoveredId !== null) {
        map.setFeatureState(
          { source: 'departments', id: hoveredId },
          { hover: false },
        )
      }
      hoveredId = null
      map.getCanvas().style.cursor = ''
      setHover(null)
    })

    map.on('click', 'dept-fill', (e) => {
      if (!e.features || e.features.length === 0) return
      const code = e.features[0].id as string
      const stats = byCode.get(code)
      if (stats?.prefecture) {
        navigateRef.current(`/?city=${encodeURIComponent(stats.prefecture)}`)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // We intentionally re-create the map when `theme` changes, so the style
    // picks up new background/border/fill colors. byCode/range are derived
    // from the stable `mapData` prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mapData])

  return (
    <div className="relative h-[70vh] w-full max-w-4xl overflow-hidden rounded-lg border">
      <div ref={mapContainerRef} className="h-full w-full" />
      {hover && <HoverTooltip info={hover} />}
      <MapLegend range={range} theme={theme} />
    </div>
  )
}

function HoverTooltip({ info }: { info: HoverInfo }) {
  const { t, lang } = useT()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const stats = info.stats

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-lg"
      style={{
        left: Math.min(info.x + 12, 600),
        top: Math.max(info.y - 70, 10),
      }}
    >
      <div className="font-medium text-sm mb-1">
        {info.code} · {info.name}
      </div>
      {stats ? (
        <>
          <div className="text-muted-foreground">
            {t('Median')}:{' '}
            <span className="text-foreground font-medium">
              {stats.medianDoy !== null ? doyToLabel(stats.medianDoy, locale) : '—'}
            </span>
          </div>
          <div className="text-muted-foreground">
            {t('Latest ever')}:{' '}
            <span className="text-foreground font-medium">
              {stats.latestDoy !== null ? doyToLabel(stats.latestDoy, locale) : '—'}
            </span>
          </div>
          <div className="text-muted-foreground mt-1">
            {stats.yearsWithFrost}/{stats.yearsWithFrost + stats.yearsWithoutFrost} {t('yrs w/ frost')}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">—</div>
      )}
    </div>
  )
}

function MapLegend({
  range,
  theme,
}: {
  range: ColorRange
  theme: 'light' | 'dark'
}) {
  const { t, lang } = useT()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const steps = [0, 0.25, 0.5, 0.75, 1]

  // Intermediate stops for labels below the gradient bar (25%, 50%, 75%).
  const intermediateStops = [0.25, 0.5, 0.75]

  return (
    <div className="absolute bottom-3 left-3 rounded-md border bg-popover/90 backdrop-blur px-3 py-2 text-xs">
      <div className="text-muted-foreground mb-1">{t('Median last frost')}</div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-[10px] text-muted-foreground">
          {doyToLabel(range.min, locale)}
        </span>
        <div className="flex flex-col">
          <div className="flex h-2 w-40 overflow-hidden rounded-sm">
            {steps.map((stop, i) => {
              const doy = range.min + (range.max - range.min) * stop
              return (
                <div
                  key={i}
                  className="flex-1"
                  style={{ background: colorForDoy(doy, range, theme) }}
                />
              )
            })}
          </div>
          <div className="relative h-3 w-40">
            {intermediateStops.map((stop) => {
              const doy = range.min + (range.max - range.min) * stop
              return (
                <span
                  key={stop}
                  className="absolute tabular-nums text-[9px] text-muted-foreground -translate-x-1/2"
                  style={{ left: `${stop * 100}%`, top: 1 }}
                >
                  {doyToLabel(doy, locale)}
                </span>
              )
            })}
          </div>
        </div>
        <span className="tabular-nums text-[10px] text-muted-foreground">
          {doyToLabel(range.max, locale)}
        </span>
      </div>
    </div>
  )
}

function doyToLabel(doy: number, locale: string): string {
  const date = new Date(Date.UTC(2001, 0, doy))
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Build a MapLibre style expression that data-drives fill-color by
 * department code. Expression format: ['match', ['id'], code1, color1, ..., default].
 */
function buildFillExpression(
  byCode: Map<string, DepartmentStats>,
  range: ColorRange,
  theme: 'light' | 'dark',
): maplibregl.ExpressionSpecification {
  const matchExpr: (string | number | unknown[])[] = ['match', ['id']]
  for (const [code, d] of byCode.entries()) {
    matchExpr.push(code)
    matchExpr.push(colorForDoy(d.medianDoy, range, theme))
  }
  // Default color for any unmatched feature.
  matchExpr.push(theme === 'dark' ? 'rgb(60, 65, 72)' : 'rgb(220, 222, 220)')
  return matchExpr as unknown as maplibregl.ExpressionSpecification
}
