// Component tests for CitySearch.
//
// We mock the Open-Meteo module so tests don't hit the network and run
// deterministically. userEvent simulates realistic typing/clicking; RTL's
// `render` mounts the component into a jsdom-backed DOM we can query.

import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CitySearch } from './CitySearch'
import { LangProvider } from '@/lib/i18n'
import type { GeocodedCity } from '@/lib/openmeteo'

// Mock the module CitySearch imports from. All tests control what
// searchCities returns by rewriting the mock per case.
vi.mock('@/lib/openmeteo', () => ({
  searchCities: vi.fn(),
}))

// Import the mocked symbol so we can configure it in each test.
import { searchCities } from '@/lib/openmeteo'
const searchCitiesMock = vi.mocked(searchCities)

// A tiny wrapper that holds the `value` state, since CitySearch is a
// controlled component and the real parent (App) owns that state.
function Harness({
  onSelect,
  initialValue = '',
}: {
  onSelect?: (choice: GeocodedCity | string) => void
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <LangProvider>
      <CitySearch
        value={value}
        onValueChange={setValue}
        onSelect={onSelect ?? (() => {})}
      />
    </LangProvider>
  )
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

const nancy: GeocodedCity = {
  name: 'Nancy',
  country: 'France',
  admin1: 'Grand Est',
  admin2: 'Meurthe-et-Moselle',
  postcodes: ['54000'],
  latitude: 48.6921,
  longitude: 6.1844,
}

beforeEach(() => {
  searchCitiesMock.mockReset()
  // Default: return nothing. Individual tests override as needed.
  searchCitiesMock.mockResolvedValue([])
})

describe('CitySearch', () => {
  test('does not fetch for queries shorter than 2 characters', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox'), 'n')

    // Wait past the debounce window to be sure nothing fires.
    await new Promise((r) => setTimeout(r, 300))
    expect(searchCitiesMock).not.toHaveBeenCalled()
  })

  test('shows suggestions after typing (debounced)', async () => {
    searchCitiesMock.mockResolvedValue([nantes, nancy])
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox'), 'nan')

    // Suggestions appear after debounce + fetch resolves.
    expect(await screen.findByText('Nantes')).toBeInTheDocument()
    expect(screen.getByText('Nancy')).toBeInTheDocument()

    // Dropdown shows disambiguation info.
    expect(screen.getByText(/44000.*Loire-Atlantique/)).toBeInTheDocument()
  })

  test('clicking a suggestion calls onSelect with the full city object', async () => {
    searchCitiesMock.mockResolvedValue([nantes, nancy])
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSelect={onSelect} />)

    await user.type(screen.getByRole('textbox'), 'nan')
    const nantesOption = await screen.findByText('Nantes')
    await user.click(nantesOption)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(nantes)
  })

  test('submitting the form calls onSelect with the raw input string', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSelect={onSelect} initialValue="Nantes" />)

    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(onSelect).toHaveBeenCalledWith('Nantes')
  })

  test('debounces rapid typing into a single fetch', async () => {
    searchCitiesMock.mockResolvedValue([nantes])
    const user = userEvent.setup()
    render(<Harness />)

    // Type 5 characters in quick succession — still one fetch.
    await user.type(screen.getByRole('textbox'), 'nantes')

    await waitFor(() => {
      expect(searchCitiesMock).toHaveBeenCalled()
    })
    expect(searchCitiesMock).toHaveBeenCalledTimes(1)
    expect(searchCitiesMock).toHaveBeenCalledWith(
      'nantes',
      5,
      expect.any(AbortSignal),
    )
  })
})
