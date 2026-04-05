# frozen-tomatoes

A website where a user enters a French city and gets stats on the last sub-0°C day before July 1st each year — to help gardeners decide when to plant frost-sensitive vegetables (tomatoes, etc.).

This is a **TypeScript learning project**. The user is an experienced Python developer; this is their first real TS codebase. Prefer clear, idiomatic TypeScript over advanced/clever patterns. When explaining concepts, contrast with Python where useful.

## Scope

### v1 (shipped)
- Single-page site
- Autocomplete city search (Open-Meteo geocoding, debounced, suggestions disambiguated by postcode + département)
- Stats panel: average / median / latest last-frost date over the last 20 complete years
- Interactive scatter chart (one dot per year) with average reference line
- Probability slider: "chance of frost after date X" computed live from history
- Shareable URL state via `?city=...`
- No backend, no database, no auth

### v2 (later)
- Interactive map for browsing data across France
- Possibly cached/aggregated data via a serverless function

## Stack

- **Build/dev:** Vite
- **Language:** TypeScript (strict)
- **UI:** React 19
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (radix/nova preset, copy-paste, owned in-repo)
- **Charts:** Recharts
- **Icons:** Lucide
- **Font:** Geist (via `@fontsource-variable/geist`)
- **Testing:** Vitest + React Testing Library + jsdom
- **Hosting:** Vercel (deploy from GitHub main)

## Data

- **Source:** Open-Meteo — free, no API key, called directly from the browser (CORS-enabled)
  - Geocoding: `https://geocoding-api.open-meteo.com/v1/search` (restricted to `countryCode=FR`)
  - Historical: `https://archive-api.open-meteo.com/v1/archive` — daily `temperature_2m_min`, ERA5 reanalysis, ~9km grid, data from 1940
- **Cutoff date:** July 1 (strictly before — configurable later)
- **Resolution:** city name → lat/lon via geocoding → nearest grid cell
- **Window:** last 20 complete years (last year = current year − 1)

Open-Meteo returns model reanalysis, not physical station data. That's fine for gardening-scale decisions; noted here so we don't claim "official station readings."

## Project structure

```
src/
├── App.tsx                  # root component, search orchestration, StatsCard
├── main.tsx                 # React entry point
├── index.css                # Tailwind + shadcn theme tokens
├── components/
│   ├── CitySearch.tsx       # autocomplete input + suggestions dropdown
│   ├── FrostChart.tsx       # scatter chart + reference/marker lines
│   └── ui/                  # shadcn components (button, card, input, slider)
├── lib/
│   ├── openmeteo.ts         # typed API client (geocoding + archive)
│   ├── stats.ts             # pure stats computation
│   ├── hooks.ts             # useDebouncedValue
│   └── utils.ts             # cn() from shadcn
└── test/
    └── setup.ts             # jsdom polyfills + jest-dom matchers
```

## Design priority

The user explicitly wants a **slick, polished visual design** — not a "dev-looking" site. Favor generous whitespace, thoughtful typography, smooth transitions, and a clean component aesthetic (shadcn/ui style). Treat UI quality as a first-class requirement, not an afterthought.

## Testing philosophy

- **`lib/stats.ts` is pure** — heavy unit-test coverage with synthetic fixtures.
- **Components** (CitySearch, StatsCard) are tested via React Testing Library with the openmeteo module mocked. Focus on user-visible behavior, not implementation.
- **No E2E tests** at v1 scope.
- Pattern: fixture tables in comments near tests so expected values are visible.

## Constraints

- Keep dependencies minimal; each one should earn its place.
- This is a learning project — explain non-obvious TS decisions in comments or chat.
- Don't over-abstract. No premature `WeatherProvider` interfaces until there's a second provider.
