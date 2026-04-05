# frozen-tomatoes

A website where a user enters a French city and gets stats on the last sub-0°C day before July 1st each year — to help gardeners decide when to plant frost-sensitive vegetables (tomatoes, etc.).

This is a **TypeScript learning project**. The user is an experienced Python developer; this is their first real TS codebase. Prefer clear, idiomatic TypeScript over advanced/clever patterns. When explaining concepts, contrast with Python where useful.

## Scope

### v1 (current)
- Single-page site
- User types a French city name → sees stats on last frost before July 1
- Stats shown: per-year last-frost date (last ~20 years), average, median, latest ever, probability of frost after date X
- No backend, no database, no auth

### v2 (later)
- Interactive map for browsing data across France
- Possibly cached/aggregated data via a serverless function

## Stack

- **Build/dev:** Vite
- **Language:** TypeScript
- **UI:** React
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (copy-paste, owned in-repo)
- **Charts:** Recharts
- **Icons:** Lucide
- **Font:** Inter
- **Hosting:** Vercel (deploy from GitHub main)

## Data

- **Source:** Open-Meteo — free, no API key, called directly from the browser (CORS-enabled)
  - Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
  - Historical: `https://archive-api.open-meteo.com/v1/archive` — daily `temperature_2m_min`, ERA5 reanalysis, ~9km grid, data from 1940
- **Cutoff date:** July 1 (configurable later)
- **Resolution:** city name → lat/lon via geocoding → nearest grid cell

Open-Meteo returns model reanalysis, not physical station data. That's fine for gardening-scale decisions; noted here so we don't claim "official station readings."

## Design priority

The user explicitly wants a **slick, polished visual design** — not a "dev-looking" site. Favor generous whitespace, thoughtful typography, smooth transitions, and a clean component aesthetic (shadcn/ui style). Treat UI quality as a first-class requirement, not an afterthought.

## Constraints

- Keep dependencies minimal; each one should earn its place.
- This is a learning project — explain non-obvious TS decisions in comments or chat.
- Don't over-abstract. No premature `WeatherProvider` interfaces until there's a second provider.
