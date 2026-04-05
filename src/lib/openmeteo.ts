// Open-Meteo client: geocoding + historical weather.
// Docs: https://open-meteo.com/en/docs/geocoding-api

// ---------- Types ----------

/**
 * A single geocoding match returned by Open-Meteo.
 * We only model the fields we actually use; extra fields are ignored.
 *
 * TS note: `type` here is like a Python TypedDict — it describes the shape
 * of a plain object, not a class. There is no runtime cost.
 */
export type GeocodedCity = {
  name: string
  country: string
  admin1?: string // region (e.g. "Pays de la Loire"), may be absent
  admin2?: string // département (e.g. "Mayenne"), may be absent
  postcodes?: string[]
  latitude: number
  longitude: number
}

/** Shape of the raw API response (what Open-Meteo sends back). */
type GeocodingApiResponse = {
  results?: Array<{
    name: string
    country: string
    admin1?: string
    admin2?: string
    postcodes?: string[]
    latitude: number
    longitude: number
  }>
}

// ---------- Functions ----------

/**
 * Look up French cities by name. Returns up to `limit` matches, best first.
 *
 * The optional `signal` lets callers cancel in-flight requests (e.g. when
 * the user keeps typing and a fresher query supersedes this one).
 */
export async function searchCities(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<GeocodedCity[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', String(limit))
  url.searchParams.set('language', 'fr')
  url.searchParams.set('countryCode', 'FR')

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Geocoding failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as GeocodingApiResponse
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    admin2: r.admin2,
    postcodes: r.postcodes,
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

/** Convenience wrapper: best single match, or null. */
export async function geocodeCity(
  query: string,
): Promise<GeocodedCity | null> {
  const results = await searchCities(query, 1)
  return results[0] ?? null
}

// ---------- Historical daily minimum temperatures ----------

/**
 * One day's minimum temperature.
 * `date` is an ISO string like "2024-03-15".
 * `minTempC` is null on the rare days Open-Meteo has no value.
 */
export type DailyMinTemp = {
  date: string
  minTempC: number | null
}

type ArchiveApiResponse = {
  daily: {
    time: string[]
    temperature_2m_min: (number | null)[]
  }
}

/**
 * Raw fetch of daily minimum 2-meter air temperature — no cache.
 * Runtime-neutral (works in browser AND Node). Uses the Europe/Paris
 * timezone so day boundaries match French civil days.
 *
 * Rate-limit note: Open-Meteo counts "API calls" by a weighted formula:
 *   weight = nLocations × (nDays / 14) × (nVariables / 10)
 * Our 26-year × 1-variable archive fetch weighs ~68 calls per request.
 * Free-tier limit is 600/min, 5000/hr, 10000/day per IP.
 */
export async function fetchDailyMinTempsRaw(
  latitude: number,
  longitude: number,
  startDate: string, // "YYYY-MM-DD"
  endDate: string,
): Promise<DailyMinTemp[]> {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('daily', 'temperature_2m_min')
  url.searchParams.set('timezone', 'Europe/Paris')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Archive fetch failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as ArchiveApiResponse
  const { time, temperature_2m_min } = data.daily

  // Zip the two parallel arrays into one array of objects.
  return time.map((date, i) => ({
    date,
    minTempC: temperature_2m_min[i],
  }))
}

/**
 * Browser-only cached wrapper around fetchDailyMinTempsRaw.
 *
 * Historical climate data is immutable: the values for 2000–2024 will never
 * change. We cache responses in localStorage, keyed by rounded coordinates
 * and the date range, to avoid hitting Open-Meteo's rate limit on repeat
 * visits and to make page loads instant.
 */
export async function fetchDailyMinTemps(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
): Promise<DailyMinTemp[]> {
  const cacheKey = makeArchiveCacheKey(latitude, longitude, startDate, endDate)
  const cached = readCache<DailyMinTemp[]>(cacheKey)
  if (cached) return cached

  const days = await fetchDailyMinTempsRaw(
    latitude,
    longitude,
    startDate,
    endDate,
  )
  writeCache(cacheKey, days)
  return days
}

// ---------- localStorage cache (simple LRU, bounded) ----------
//
// Each cached entry is ~200 KB JSON. We cap at N entries and evict the
// least-recently-read one when full.

const CACHE_PREFIX = 'frozen-tomatoes.archive:'
const CACHE_MAX_ENTRIES = 20

function makeArchiveCacheKey(
  lat: number,
  lon: number,
  start: string,
  end: string,
): string {
  // Round coords to 3 decimals (~100m) to share cache between near-identical
  // lookups from different geocoding results for the same city.
  const la = lat.toFixed(3)
  const lo = lon.toFixed(3)
  return `${CACHE_PREFIX}${la},${lo}|${start}|${end}`
}

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const { value } = JSON.parse(raw) as { value: T; readAt: number }
    // Touch the entry (update readAt) so LRU eviction considers it fresh.
    window.localStorage.setItem(
      key,
      JSON.stringify({ value, readAt: Date.now() }),
    )
    return value
  } catch {
    return null
  }
}

function writeCache<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ value, readAt: Date.now() }),
    )
    evictOldEntriesIfFull()
  } catch {
    // localStorage full or disabled; continue without caching.
  }
}

function evictOldEntriesIfFull(): void {
  const entries: Array<{ key: string; readAt: number }> = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(CACHE_PREFIX)) continue
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const { readAt } = JSON.parse(raw) as { readAt: number }
      entries.push({ key, readAt })
    } catch {
      // Corrupt entry — remove it.
      window.localStorage.removeItem(key)
    }
  }
  if (entries.length <= CACHE_MAX_ENTRIES) return
  // Sort oldest-first and drop until we're back under the limit.
  entries.sort((a, b) => a.readAt - b.readAt)
  const toEvict = entries.slice(0, entries.length - CACHE_MAX_ENTRIES)
  for (const { key } of toEvict) {
    window.localStorage.removeItem(key)
  }
}
