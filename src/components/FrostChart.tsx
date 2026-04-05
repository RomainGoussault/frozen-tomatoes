// Scatter plot: one dot per year, showing the last frost's day-of-year.
// A dashed line marks the 20-year average.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

  // Y-axis: pad the observed range so bars don't touch the top/bottom edges.
  const doys = data.map((d) => d.doy)
  const yMin = Math.max(1, Math.min(...doys) - 12)
  const yMax = Math.min(365, Math.max(...doys) + 12)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 48, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            className="text-muted-foreground"
          />
          <YAxis
            type="number"
            domain={[yMin, yMax]}
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => doyToMonthDay(d, locale)}
            width={48}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <Tooltip content={<FrostTooltip locale={locale} />} cursor={{ fill: 'transparent' }} />
          {stats.averageDayOfYear !== null && (
            <ReferenceLine
              y={stats.averageDayOfYear}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-muted-foreground"
              label={{
                value: t('avg'),
                position: 'insideRight',
                offset: 6,
                dy: -8,
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
          <Bar dataKey="doy" fill="currentColor" className="text-primary" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
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
