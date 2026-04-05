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
