// Precompute frost stats for every French département and write the
// aggregate JSON to public/map-data.json.
//
// Run: pnpm exec tsx scripts/build-map.ts
//
// Rate-limit strategy: Open-Meteo counts weighted API calls —
//   weight = nLocations × (nDays / 14) × (nVariables / 10)
// Our 26-year × 1-variable archive fetch is ~68 calls each. With a
// 600/minute limit, we can safely do ~8 requests per minute. We sleep
// 8s between requests (=7.5 req/min) to stay comfortably under.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { fetchDailyMinTempsRaw } from '../src/lib/openmeteo.ts'
import { computeFrostStats } from '../src/lib/stats.ts'
import { DEPARTMENTS, type Department } from './data/departments.ts'

const START_YEAR = 2000
const END_YEAR = new Date().getFullYear() - 1
// Weighted-call budget: each 26y × 1-var request ≈ 68 calls. Free limits
// are 600/min + 5000/hour + 10000/day, all rolling windows.
// 50s between requests = 72 req/hour × 68 = 4896 weighted calls/hour —
// just under the 5000/hour cap. Whole run ≈ 80 min.
const SLEEP_BETWEEN_REQUESTS_MS = 50_000
// Backoffs in seconds when we hit a 429 anyway.
const BACKOFF_SCHEDULE_S = [60, 120, 300, 600, 900]

type DepartmentStats = {
  code: string
  name: string
  prefecture: string
  lat: number
  lon: number
  averageDoy: number | null
  medianDoy: number | null
  latestDoy: number | null
  yearsWithFrost: number
  yearsWithoutFrost: number
  /** Per-year day-of-year, sorted by year. `null` = no frost that year. */
  perYearDoys: (number | null)[]
}

type MapData = {
  generatedAt: string
  startYear: number
  endYear: number
  departments: DepartmentStats[]
}

async function fetchDepartment(
  dept: Department,
  attempt = 0,
): Promise<DepartmentStats> {
  try {
    const days = await fetchDailyMinTempsRaw(
      dept.lat,
      dept.lon,
      `${START_YEAR}-01-01`,
      `${END_YEAR}-12-31`,
    )
    const stats = computeFrostStats(days)
    // Flatten to a compact per-department record.
    return {
      code: dept.code,
      name: dept.name,
      prefecture: dept.prefecture,
      lat: dept.lat,
      lon: dept.lon,
      averageDoy: stats.averageDayOfYear,
      medianDoy: medianDoyFromResults(stats.perYear),
      latestDoy: latestDoyFromResults(stats.perYear),
      yearsWithFrost: stats.yearsWithFrost,
      yearsWithoutFrost: stats.yearsWithoutFrost,
      perYearDoys: stats.perYear.map((y) => y.dayOfYear),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (attempt < BACKOFF_SCHEDULE_S.length && msg.includes('429')) {
      const waitS = BACKOFF_SCHEDULE_S[attempt]
      console.warn(
        `  [${dept.code}] 429 hit, backing off ${waitS}s (retry ${attempt + 1}/${BACKOFF_SCHEDULE_S.length})`,
      )
      await sleep(waitS * 1000)
      return fetchDepartment(dept, attempt + 1)
    }
    throw err
  }
}

function medianDoyFromResults(
  perYear: Array<{ dayOfYear: number | null }>,
): number | null {
  const doys = perYear
    .map((y) => y.dayOfYear)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)
  if (doys.length === 0) return null
  return doys[Math.floor(doys.length / 2)]
}

function latestDoyFromResults(
  perYear: Array<{ dayOfYear: number | null }>,
): number | null {
  let max: number | null = null
  for (const y of perYear) {
    if (y.dayOfYear !== null && (max === null || y.dayOfYear > max)) {
      max = y.dayOfYear
    }
  }
  return max
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const outPath = resolve(here, '..', 'public', 'map-data.json')

  // Resume: if map-data.json already exists, load previously-fetched
  // departments and skip them. Makes the script safe to re-run after
  // a 429 / network blip without re-spending weighted API calls.
  const existing = await readExistingResults(outPath)
  const have = new Set(existing.map((r) => r.code))
  if (have.size > 0) {
    console.log(`Resuming: ${have.size}/${DEPARTMENTS.length} already fetched`)
  }

  console.log(
    `Precomputing frost stats for ${DEPARTMENTS.length - have.size} remaining départements (${START_YEAR}-${END_YEAR})`,
  )
  const remaining = DEPARTMENTS.filter((d) => !have.has(d.code))
  console.log(
    `Expected runtime: ~${Math.ceil((remaining.length * SLEEP_BETWEEN_REQUESTS_MS) / 60_000)} min`,
  )
  console.log('')

  const results: DepartmentStats[] = [...existing]
  const start = Date.now()

  for (let i = 0; i < remaining.length; i++) {
    const dept = remaining[i]
    const idx = DEPARTMENTS.findIndex((d) => d.code === dept.code) + 1
    const prefix = `[${idx}/${DEPARTMENTS.length}] ${dept.code} ${dept.name}`
    process.stdout.write(`${prefix}... `)
    const stats = await fetchDepartment(dept)
    const avg = stats.averageDoy !== null ? `avg DoY=${stats.averageDoy}` : 'no frost'
    console.log(avg)
    results.push(stats)

    // Checkpoint to disk after EVERY successful fetch, so a crash loses
    // at most one department's worth of work.
    await writeResults(outPath, results)

    if (i < remaining.length - 1) {
      await sleep(SLEEP_BETWEEN_REQUESTS_MS)
    }
  }

  const elapsedMin = ((Date.now() - start) / 60_000).toFixed(1)
  console.log('')
  console.log(`Wrote ${outPath}`)
  console.log(`Elapsed: ${elapsedMin} min`)
}

async function readExistingResults(
  path: string,
): Promise<DepartmentStats[]> {
  try {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as MapData
    // Only re-use if the year window matches.
    if (parsed.startYear === START_YEAR && parsed.endYear === END_YEAR) {
      return parsed.departments
    }
    console.log('Year window changed; starting fresh.')
    return []
  } catch {
    return []
  }
}

async function writeResults(
  path: string,
  results: DepartmentStats[],
): Promise<void> {
  // Preserve the original DEPARTMENTS ordering so re-runs produce stable diffs.
  const order = new Map(DEPARTMENTS.map((d, i) => [d.code, i]))
  const sorted = [...results].sort(
    (a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0),
  )
  const output: MapData = {
    generatedAt: new Date().toISOString().slice(0, 10),
    startYear: START_YEAR,
    endYear: END_YEAR,
    departments: sorted,
  }
  await writeFile(path, JSON.stringify(output, null, 2) + '\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
