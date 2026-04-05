// Pure functions for computing last-frost statistics from daily min temps.
//
// Design note: nothing in this file touches the network, React, or the DOM.
// That makes it trivially unit-testable and easy to reason about — exactly
// like a well-scoped Python module.

import type { DailyMinTemp } from './openmeteo'

/** Per-year last frost, or null if the year had no frost before the cutoff. */
export type YearResult = {
  year: number
  lastFrostDate: string | null // "YYYY-MM-DD", null = no frost that year
  dayOfYear: number | null // 1–365 (non-leap reference), null = no frost
}

export type FrostStats = {
  perYear: YearResult[]
  yearsWithFrost: number
  yearsWithoutFrost: number
  /** Average last-frost date (as "MM-DD") across years that had frost. */
  averageDate: string | null
  /** Median last-frost date (as "MM-DD") across years that had frost. */
  medianDate: string | null
  /** Latest last-frost date ever observed. */
  latestDate: string | null
  /** Average last-frost day-of-year (for plotting reference lines). */
  averageDayOfYear: number | null
}

/**
 * The cutoff: we only consider frost occurring strictly before this date
 * each year (month is 1-indexed here for readability; JS Date months are 0-indexed).
 */
const CUTOFF_MONTH = 7 // July
const CUTOFF_DAY = 1

/**
 * Compute last-frost stats from a flat list of daily temperatures.
 *
 * Assumes `days` is sorted by date and covers whole years (e.g., Jan 1 → Dec 31).
 */
export function computeFrostStats(days: DailyMinTemp[]): FrostStats {
  // Group days by year.
  const byYear = new Map<number, DailyMinTemp[]>()
  for (const day of days) {
    const year = Number(day.date.slice(0, 4))
    const bucket = byYear.get(year) ?? []
    bucket.push(day)
    byYear.set(year, bucket)
  }

  // For each year, find the last day before July 1 with minTempC < 0.
  const perYear: YearResult[] = []
  for (const [year, yearDays] of byYear) {
    let lastFrost: string | null = null
    for (const day of yearDays) {
      if (day.minTempC === null) continue
      if (!isBeforeCutoff(day.date)) continue
      if (day.minTempC < 0) {
        // Because yearDays is sorted, the last one we see is the latest.
        lastFrost = day.date
      }
    }
    perYear.push({
      year,
      lastFrostDate: lastFrost,
      dayOfYear: lastFrost ? dayOfYear(lastFrost) : null,
    })
  }

  perYear.sort((a, b) => a.year - b.year)

  // Aggregate across years.
  const frostDates = perYear
    .map((y) => y.lastFrostDate)
    .filter((d): d is string => d !== null)

  const yearsWithFrost = frostDates.length
  const yearsWithoutFrost = perYear.length - yearsWithFrost

  if (yearsWithFrost === 0) {
    return {
      perYear,
      yearsWithFrost,
      yearsWithoutFrost,
      averageDate: null,
      medianDate: null,
      latestDate: null,
      averageDayOfYear: null,
    }
  }

  // Convert each date to its day-of-year (1–366), average, then convert back.
  const daysOfYear = frostDates.map(dayOfYear).sort((a, b) => a - b)
  const avgDoy = Math.round(
    daysOfYear.reduce((sum, d) => sum + d, 0) / daysOfYear.length,
  )
  const medDoy = daysOfYear[Math.floor(daysOfYear.length / 2)]

  // Latest = maximum month-day across all years (not day-of-year, since
  // leap-year Feb 29 matters very little here, but we want the calendar date).
  const latestDate = frostDates
    .slice()
    .sort((a, b) => monthDay(a).localeCompare(monthDay(b)))
    .at(-1)!

  return {
    perYear,
    yearsWithFrost,
    yearsWithoutFrost,
    averageDate: doyToMonthDay(avgDoy),
    medianDate: doyToMonthDay(medDoy),
    latestDate: monthDay(latestDate),
    averageDayOfYear: avgDoy,
  }
}

/**
 * Probability that frost occurs AFTER the given day-of-year, based on the
 * per-year history. A year with no frost at all counts as "no frost after".
 *
 * Returns a value in [0, 1], or null if there's no data.
 */
export function probabilityOfFrostAfter(
  stats: FrostStats,
  dayOfYear: number,
): number | null {
  const total = stats.perYear.length
  if (total === 0) return null
  const yearsAfter = stats.perYear.filter(
    (y) => y.dayOfYear !== null && y.dayOfYear > dayOfYear,
  ).length
  return yearsAfter / total
}

// ---------- Date helpers (kept local; no external deps) ----------

function isBeforeCutoff(isoDate: string): boolean {
  // isoDate is "YYYY-MM-DD". Compare month-day to the cutoff.
  const month = Number(isoDate.slice(5, 7))
  const day = Number(isoDate.slice(8, 10))
  if (month < CUTOFF_MONTH) return true
  if (month > CUTOFF_MONTH) return false
  return day < CUTOFF_DAY
}

function monthDay(isoDate: string): string {
  return isoDate.slice(5) // "MM-DD"
}

/** Day-of-year in a non-leap reference year (Jan 1 = 1, Dec 31 = 365). */
function dayOfYear(isoDate: string): number {
  const month = Number(isoDate.slice(5, 7))
  const day = Number(isoDate.slice(8, 10))
  // Days before each month in a non-leap year.
  const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return daysBeforeMonth[month - 1] + day
}

export function doyToMonthDay(doy: number): string {
  // Convert back using a Date object in UTC anchored at 2001 (non-leap).
  const date = new Date(Date.UTC(2001, 0, doy))
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${mm}-${dd}`
}
