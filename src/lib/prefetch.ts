// Prefetch the full city → stats pipeline at page-load time, before React
// even mounts, so URLs like /?city=Nantes feel instant.
//
// main.tsx reads ?city=, calls prefetchCityData() immediately, and stashes
// the in-flight promise here. App's runSearch() later calls takePrefetched()
// and — if the city matches — awaits the already-running promise instead of
// starting a fresh fetch. Saves ~200-400ms on cold URL-with-city loads.

import {
  geocodeCity,
  fetchDailyMinTemps,
  type GeocodedCity,
  type DailyMinTemp,
} from './openmeteo'

export type PrefetchedCityData = {
  city: GeocodedCity
  days: DailyMinTemp[]
} | null

type Entry = { name: string; promise: Promise<PrefetchedCityData> }

let cached: Entry | null = null

export function prefetchCityData(
  name: string,
  startYear: number,
  endYear: number,
): void {
  cached = {
    name,
    promise: (async () => {
      const city = await geocodeCity(name)
      if (!city) return null
      const days = await fetchDailyMinTemps(
        city.latitude,
        city.longitude,
        `${startYear}-01-01`,
        `${endYear}-12-31`,
      )
      return { city, days }
    })(),
  }
  // Attach a noop .catch so an early rejection doesn't become an
  // "unhandled promise rejection" before App's code awaits it.
  cached.promise.catch(() => {})
}

/**
 * If we prefetched data for `name`, return the promise and clear the cache
 * (one-shot). Case-insensitive match. Returns null if no match.
 */
export function takePrefetched(
  name: string,
): Promise<PrefetchedCityData> | null {
  if (!cached) return null
  if (cached.name.toLowerCase() !== name.toLowerCase()) return null
  const { promise } = cached
  cached = null
  return promise
}
