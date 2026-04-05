// Tests for the stats module. All inputs are synthetic, no I/O.
//
// Run with: pnpm test
// Vitest auto-discovers *.test.ts files and watches for changes.

import { describe, expect, test } from 'vitest'
import {
  computeFrostStats,
  probabilityOfFrostAfter,
  doyToMonthDay,
} from './stats'
import type { DailyMinTemp } from './openmeteo'

// ---------- Helpers ----------

/** Build a DailyMinTemp inline. */
function day(date: string, minTempC: number | null): DailyMinTemp {
  return { date, minTempC }
}

/**
 * Build a full year of daily entries with a given default temperature,
 * then apply specific overrides by date.
 */
function yearOfDays(
  year: number,
  defaultTemp: number,
  overrides: Record<string, number | null> = {},
): DailyMinTemp[] {
  const days: DailyMinTemp[] = []
  // Just use the first 6 months + a couple July days — that's the range
  // that matters for our stats, and avoids dealing with leap years.
  const monthDays = [31, 28, 31, 30, 31, 30, 2] // Jan..June + Jul 1–2
  let month = 1
  for (const count of monthDays) {
    for (let d = 1; d <= count; d++) {
      const mm = String(month).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      const date = `${year}-${mm}-${dd}`
      const temp = date in overrides ? overrides[date] : defaultTemp
      days.push(day(date, temp))
    }
    month++
  }
  return days
}

// ---------- computeFrostStats ----------

describe('computeFrostStats', () => {
  test('finds the last sub-zero day before July 1', () => {
    const days = yearOfDays(2020, 10, {
      '2020-01-15': -5,
      '2020-03-10': -2,
      '2020-04-20': -1, // latest frost
      '2020-05-05': 0, // zero is NOT frost (strict <)
    })
    const stats = computeFrostStats(days)
    expect(stats.perYear).toHaveLength(1)
    expect(stats.perYear[0].lastFrostDate).toBe('2020-04-20')
    expect(stats.yearsWithFrost).toBe(1)
    expect(stats.yearsWithoutFrost).toBe(0)
  })

  test('ignores frost on or after July 1', () => {
    const days = yearOfDays(2020, 10, {
      '2020-03-10': -2, // should be picked
      '2020-07-01': -3, // cutoff — excluded (not strictly before July 1)
      '2020-07-02': -4, // also excluded
    })
    const stats = computeFrostStats(days)
    expect(stats.perYear[0].lastFrostDate).toBe('2020-03-10')
  })

  test('returns null lastFrostDate for years with no frost', () => {
    const days = yearOfDays(2020, 10) // all +10°C
    const stats = computeFrostStats(days)
    expect(stats.perYear[0].lastFrostDate).toBe(null)
    expect(stats.perYear[0].dayOfYear).toBe(null)
    expect(stats.yearsWithFrost).toBe(0)
    expect(stats.yearsWithoutFrost).toBe(1)
  })

  test('treats exactly 0°C as NOT frost (strict comparison)', () => {
    const days = yearOfDays(2020, 10, { '2020-03-01': 0 })
    const stats = computeFrostStats(days)
    expect(stats.perYear[0].lastFrostDate).toBe(null)
  })

  test('skips null min temperatures', () => {
    const days = yearOfDays(2020, 10, {
      '2020-03-10': -1,
      '2020-04-10': null, // missing data
      '2020-04-11': -2, // this should be the latest
    })
    const stats = computeFrostStats(days)
    expect(stats.perYear[0].lastFrostDate).toBe('2020-04-11')
  })

  test('aggregates across multiple years', () => {
    const days = [
      ...yearOfDays(2020, 10, { '2020-03-15': -1 }),
      ...yearOfDays(2021, 10, { '2021-04-10': -1 }),
      ...yearOfDays(2022, 10, { '2022-02-20': -1 }),
    ]
    const stats = computeFrostStats(days)
    expect(stats.perYear.map((y) => y.year)).toEqual([2020, 2021, 2022])
    expect(stats.yearsWithFrost).toBe(3)
    // Median = middle of sorted [day51, day74, day100] = day 74 → Mar 15
    expect(stats.medianDate).toBe('03-15')
    // Latest = April 10 (largest month-day across years)
    expect(stats.latestDate).toBe('04-10')
  })

  test('counts mixed frost/no-frost years correctly', () => {
    const days = [
      ...yearOfDays(2020, 10, { '2020-03-15': -1 }),
      ...yearOfDays(2021, 10), // no frost
      ...yearOfDays(2022, 10, { '2022-03-20': -1 }),
    ]
    const stats = computeFrostStats(days)
    expect(stats.yearsWithFrost).toBe(2)
    expect(stats.yearsWithoutFrost).toBe(1)
    expect(stats.averageDate).not.toBe(null)
  })

  test('returns sensible defaults for empty input', () => {
    const stats = computeFrostStats([])
    expect(stats.perYear).toEqual([])
    expect(stats.yearsWithFrost).toBe(0)
    expect(stats.yearsWithoutFrost).toBe(0)
    expect(stats.averageDate).toBe(null)
    expect(stats.medianDate).toBe(null)
    expect(stats.latestDate).toBe(null)
  })

  test('returns null aggregates when no year has frost', () => {
    const days = [...yearOfDays(2020, 10), ...yearOfDays(2021, 10)]
    const stats = computeFrostStats(days)
    expect(stats.averageDate).toBe(null)
    expect(stats.medianDate).toBe(null)
    expect(stats.latestDate).toBe(null)
    expect(stats.averageDayOfYear).toBe(null)
  })
})

// ---------- probabilityOfFrostAfter ----------

describe('probabilityOfFrostAfter', () => {
  test('returns fraction of years with frost after given day-of-year', () => {
    const days = [
      ...yearOfDays(2020, 10, { '2020-03-01': -1 }), // doy 61
      ...yearOfDays(2021, 10, { '2021-04-01': -1 }), // doy 91
      ...yearOfDays(2022, 10, { '2022-05-01': -1 }), // doy 121
      ...yearOfDays(2023, 10, { '2023-05-15': -1 }), // doy 135
    ]
    const stats = computeFrostStats(days)
    // 2 of 4 years have last frost after April 15 (doy 105).
    expect(probabilityOfFrostAfter(stats, 105)).toBe(0.5)
    // All 4 had frost after Feb 1 (doy 32).
    expect(probabilityOfFrostAfter(stats, 32)).toBe(1)
    // None had frost after June 1 (doy 152).
    expect(probabilityOfFrostAfter(stats, 152)).toBe(0)
  })

  test('years with no frost count in the denominator, not numerator', () => {
    const days = [
      ...yearOfDays(2020, 10, { '2020-05-15': -1 }), // frost after May 1
      ...yearOfDays(2021, 10), // no frost
    ]
    const stats = computeFrostStats(days)
    // 1 year with frost-after-May-1 out of 2 total years.
    expect(probabilityOfFrostAfter(stats, 121)).toBe(0.5)
  })

  test('returns null when there are no years at all', () => {
    const stats = computeFrostStats([])
    expect(probabilityOfFrostAfter(stats, 100)).toBe(null)
  })
})

// ---------- doyToMonthDay ----------

describe('doyToMonthDay', () => {
  test('converts day-of-year to MM-DD (non-leap reference)', () => {
    expect(doyToMonthDay(1)).toBe('01-01')
    expect(doyToMonthDay(32)).toBe('02-01')
    expect(doyToMonthDay(60)).toBe('03-01') // Mar 1 in non-leap year
    expect(doyToMonthDay(91)).toBe('04-01')
    expect(doyToMonthDay(121)).toBe('05-01')
    expect(doyToMonthDay(152)).toBe('06-01')
    expect(doyToMonthDay(182)).toBe('07-01')
    expect(doyToMonthDay(365)).toBe('12-31')
  })
})
