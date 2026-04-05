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
  latitude: number
  longitude: number
}

/** Shape of the raw API response (what Open-Meteo sends back). */
type GeocodingApiResponse = {
  results?: Array<{
    name: string
    country: string
    admin1?: string
    latitude: number
    longitude: number
  }>
}

// ---------- Functions ----------

/**
 * Look up a French city by name. Returns the best match, or null if none.
 *
 * We restrict to country=FR since this project is French-only for v1.
 */
export async function geocodeCity(
  query: string,
): Promise<GeocodedCity | null> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'fr')
  url.searchParams.set('countryCode', 'FR')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Geocoding failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as GeocodingApiResponse
  const first = data.results?.[0]
  if (!first) return null

  return {
    name: first.name,
    country: first.country,
    admin1: first.admin1,
    latitude: first.latitude,
    longitude: first.longitude,
  }
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
 * Fetch daily minimum 2-meter air temperature for a location, inclusive range.
 * Uses the Europe/Paris timezone so day boundaries match French civil days.
 */
export async function fetchDailyMinTemps(
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
