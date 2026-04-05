// Component tests for StatsCard — the interactive slider + probability
// readout piece of the app.
//
// We build a synthetic FrostStats fixture with known values so we can
// predict the probability output for any slider position. The initial
// slider position depends on today's date, so we pin it with fake timers.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatsCard } from './App'
import { LangProvider } from '@/lib/i18n'
import type { GeocodedCity } from '@/lib/openmeteo'
import type { FrostStats, YearResult } from '@/lib/stats'

function renderCard(city: GeocodedCity, stats: FrostStats) {
  return render(
    <LangProvider>
      <StatsCard city={city} stats={stats} />
    </LangProvider>,
  )
}

// Four synthetic years with last-frost day-of-year = 60, 80, 100, 120.
//
//  Selected doy | years with frost AFTER selected | probability
//  --------------+---------------------------------+------------
//      95        | {100, 120}                      | 2/4 = 50%
//     100        | {120}                           | 1/4 = 25%
//     120        | {}                              | 0/4 = 0%
const years: YearResult[] = [
  { year: 2020, lastFrostDate: '2020-03-01', dayOfYear: 60 },
  { year: 2021, lastFrostDate: '2021-03-21', dayOfYear: 80 },
  { year: 2022, lastFrostDate: '2022-04-10', dayOfYear: 100 },
  { year: 2023, lastFrostDate: '2023-04-30', dayOfYear: 120 },
]

const stats: FrostStats = {
  perYear: years,
  yearsWithFrost: 4,
  yearsWithoutFrost: 0,
  averageDate: '03-31',
  medianDate: '03-31',
  latestDate: '04-30',
  averageDayOfYear: 90,
}

const nantes: GeocodedCity = {
  name: 'Nantes',
  country: 'France',
  admin1: 'Pays de la Loire',
  admin2: 'Loire-Atlantique',
  postcodes: ['44000'],
  latitude: 47.2184,
  longitude: -1.5536,
}

describe('StatsCard', () => {
  beforeEach(() => {
    // Pin today to April 5 → day-of-year 95 (non-leap reference).
    // We only fake Date, not setTimeout etc, so userEvent still works.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-05T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('renders city name with département', () => {
    renderCard(nantes, stats)
    expect(screen.getByText('Nantes, Loire-Atlantique')).toBeInTheDocument()
  })

  test('shows initial probability at today\'s day-of-year', () => {
    renderCard(nantes, stats)
    // Today (Apr 5) = doy 95 → clamped inside [50, 130] → 95.
    // 2 of 4 years had frost after doy 95 → 50%.
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  test('updates probability when slider is moved right', async () => {
    const user = userEvent.setup()
    renderCard(nantes, stats)

    expect(screen.getByText('50%')).toBeInTheDocument()

    // Radix slider: the thumb has role="slider" and responds to arrows.
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowRight>5}') // 95 + 5 = 100

    // At doy 100: only 1 of 4 years (doy 120) had frost after → 25%.
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  test('shows 0% when slider is past the latest observed frost', async () => {
    const user = userEvent.setup()
    renderCard(nantes, stats)

    const slider = screen.getByRole('slider')
    slider.focus()
    // From 95 to 130 is 35 steps (slider max = max(doys)+10 = 130).
    await user.keyboard('{ArrowRight>35}')

    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
