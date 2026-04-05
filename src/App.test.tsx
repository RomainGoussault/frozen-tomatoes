// Component tests for StatsCard — the interactive slider + probability
// readout piece of the app.
//
// We build a synthetic FrostStats fixture with known values so we can
// predict the probability output for any slider position.

import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatsCard } from './App'
import type { GeocodedCity } from '@/lib/openmeteo'
import type { FrostStats, YearResult } from '@/lib/stats'

// Four synthetic years with last-frost day-of-year = 60, 80, 100, 120.
// Average doy = 90 (that's where the slider starts).
//
//  Selected doy | years with frost AFTER selected | probability
//  --------------+---------------------------------+------------
//      90        | {100, 120}                      | 2/4 = 50%
//      99        | {100, 120}                      | 2/4 = 50%
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
  averageDate: '03-31', // doy 90
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
  test('renders city name with département', () => {
    render(<StatsCard city={nantes} stats={stats} />)
    expect(
      screen.getByText('Nantes, Loire-Atlantique'),
    ).toBeInTheDocument()
  })

  test('shows initial probability at the average day-of-year', () => {
    render(<StatsCard city={nantes} stats={stats} />)
    // Initial slider position = averageDayOfYear (90).
    // 2 of 4 years had frost after doy 90 → 50%.
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  test('updates probability when slider is moved right', async () => {
    const user = userEvent.setup()
    render(<StatsCard city={nantes} stats={stats} />)

    expect(screen.getByText('50%')).toBeInTheDocument()

    // Radix sliders expose the thumb with role="slider" and respond to
    // arrow keys. Each ArrowRight increments by the step (1).
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowRight>10}') // press ArrowRight 10 times

    // Now at doy 100: only 1 of 4 years (doy 120) had frost after → 25%.
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  test('shows 0% when slider is past the latest observed frost', async () => {
    const user = userEvent.setup()
    render(<StatsCard city={nantes} stats={stats} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    // From 90 to 130 is 40 steps (slider max = max(doys)+10 = 130).
    await user.keyboard('{ArrowRight>40}')

    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
