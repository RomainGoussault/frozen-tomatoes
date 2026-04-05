// Scatter plot: one dot per year, showing the last frost's day-of-year.
// A dashed line marks the 20-year average.

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { FrostStats } from '@/lib/stats'
import { useT, toLocale } from '@/lib/i18n'

type Props = {
  stats: FrostStats
  /** Optional horizontal marker line (e.g. slider-selected day-of-year). */
  markerDoy?: number
}

export function FrostChart({ stats, markerDoy }: Props) {
  const { t, lang } = useT()
  const locale = toLocale(lang)

  // Recharts wants a flat array of {x, y} objects. We drop years with no frost.
  const data = stats.perYear
    .filter((y) => y.dayOfYear !== null)
    .map((y) => ({
      year: y.year,
      doy: y.dayOfYear as number,
      date: y.lastFrostDate as string,
    }))

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-xs text-center">
        {t('No frost observed in the last 20 years.')}
      </p>
    )
  }

  // Compute a padded y-axis range so dots don't sit on the edges.
  const doys = data.map((d) => d.doy)
  const yMin = Math.max(1, Math.min(...doys) - 10)
  const yMax = Math.min(365, Math.max(...doys) + 10)

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="year"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            dataKey="doy"
            type="number"
            domain={[yMin, yMax]}
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => doyToMonthDay(d, locale)}
            width={44}
            className="text-muted-foreground"
          />
          <Tooltip content={<FrostTooltip locale={locale} />} cursor={{ strokeDasharray: '3 3' }} />
          {stats.averageDayOfYear !== null && (
            <ReferenceLine
              y={stats.averageDayOfYear}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-muted-foreground"
              label={{
                value: t('avg'),
                position: 'right',
                fontSize: 10,
                className: 'fill-muted-foreground',
              }}
            />
          )}
          {markerDoy !== undefined && (
            <ReferenceLine
              y={markerDoy}
              stroke="currentColor"
              strokeWidth={2}
              className="text-primary"
            />
          )}
          <Scatter data={data} fill="currentColor" className="text-primary" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Custom tooltip showing the year + full date. */
function FrostTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean
  payload?: Array<{ payload: { year: number; date: string } }>
  locale: string
}) {
  if (!active || !payload?.length) return null
  const { year, date } = payload[0].payload
  const formatted = formatFullDate(date, locale)
  return (
    <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
      <div className="font-medium">{year}</div>
      <div className="text-muted-foreground">{formatted}</div>
    </div>
  )
}

function doyToMonthDay(doy: number, locale: string): string {
  const date = new Date(Date.UTC(2001, 0, doy))
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatFullDate(isoDate: string, locale: string): string {
  const date = new Date(isoDate + 'T00:00:00Z')
  return date.toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
