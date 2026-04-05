// A search input with live city suggestions from Open-Meteo geocoding.
//
// Design: a controlled input + a dropdown of suggestions. The parent owns
// the text value; we handle fetching and rendering suggestions. When the
// user clicks a suggestion or submits the form, we call onSelect() with
// the chosen city (or the current text on raw submit).

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { searchCities, type GeocodedCity } from '@/lib/openmeteo'
import { useDebouncedValue } from '@/lib/hooks'

type Props = {
  value: string
  onValueChange: (v: string) => void
  onSelect: (choice: GeocodedCity | string) => void
  disabled?: boolean
}

export function CitySearch({
  value,
  onValueChange,
  onSelect,
  disabled,
}: Props) {
  const [suggestions, setSuggestions] = useState<GeocodedCity[]>([])
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(value, 200)
  const containerRef = useRef<HTMLFormElement>(null)

  // Fetch suggestions when the debounced query changes.
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    searchCities(trimmed, 5, controller.signal)
      .then((results) => setSuggestions(results))
      .catch((err) => {
        // Ignore cancellations from newer queries; log real errors.
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err)
        }
      })

    // Cleanup: if debouncedQuery changes again, cancel this in-flight fetch.
    return () => controller.abort()
  }, [debouncedQuery])

  // Close the dropdown if the user clicks outside it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setOpen(false)
    onSelect(value)
  }

  function handlePick(city: GeocodedCity) {
    onValueChange(city.name)
    setOpen(false)
    onSelect(city)
  }

  const showDropdown = open && suggestions.length > 0

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit}
      className="relative flex w-full max-w-md gap-2"
    >
      <Input
        placeholder="Nantes, Lyon, Strasbourg…"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        autoFocus
        autoComplete="off"
      />
      <Button type="submit" disabled={disabled}>
        Search
      </Button>

      {showDropdown && (
        <ul className="absolute left-0 right-20 top-11 z-10 overflow-hidden rounded-md border bg-popover shadow-md">
          {suggestions.map((city) => (
            <li key={`${city.name}-${city.latitude}-${city.longitude}`}>
              <button
                type="button"
                onClick={() => handlePick(city)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="font-medium">{city.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatLocation(city)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}

/** Compact location string, most specific info first: "53000 · Mayenne". */
function formatLocation(city: GeocodedCity): string {
  const parts: string[] = []
  if (city.postcodes && city.postcodes.length > 0) {
    parts.push(city.postcodes[0])
  }
  if (city.admin2) {
    parts.push(city.admin2)
  } else if (city.admin1) {
    parts.push(city.admin1)
  }
  return parts.join(' · ')
}
