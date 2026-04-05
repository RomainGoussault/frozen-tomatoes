# v2 spec — map of France

v2 adds a single feature on top of v1: an **interactive map of France, colored by last-frost date**. Users can see regional variation at a glance, pan/zoom, hover a region for its stats card, click-through to the full single-city view.

## Goal

Turn frozen-tomatoes from a *lookup tool* ("what's the last frost in Nantes?") into a *browsable dataset* ("show me the whole country").

## Scope — in

- Interactive map covering metropolitan France
- Each region/cell colored by a **stat we can select** (median last-frost date, probability at a chosen date, latest-ever)
- **Hover a region** → small tooltip with the region's key stats
- **Click a region** → navigate to `/?city=<name>`, rendering the v1 card
- A **date slider** that recolors the map live: "show probability of frost after May 15"
- Works offline once the data is loaded
- Bilingual (FR/EN) + dark mode, same as v1

## Scope — out (for v2)

- User accounts, favorites, alerts
- Planting calendars per vegetable
- Climate trend lines
- City comparison side-by-side
- Custom time windows (stays fixed at 2000 → last complete year)
- Worldwide coverage (France only)

## Architecture: Python precompute, no backend

**Decision: precompute all map data as a static JSON file using Python, shipped via the CDN. No backend server, no serverless functions.**

### Why this works

Climate stats are **stable**:
- The archive covers 2000 → last complete year
- Historical values never change (only the end date rolls forward once per year)
- Same query today = same query tomorrow = same query next week

Therefore we can **compute once, serve forever** — or more precisely, **recompute once a year** when a new complete year becomes available.

### Why not a backend

| Concern | Backend? | Static precompute? |
|---|---|---|
| Data freshness | Updates anytime | Stale ~364 days of the year, fresh after annual rebuild |
| Cost | $5+/mo + auth + monitoring | $0, served from Vercel CDN |
| Latency | API call per request | Single file load, CDN-cached |
| Open-Meteo rate limit | Hit on every user request | Hit *once* during precompute |
| Complexity | Serverless function + env vars | One Python script |
| User's Python skills | Transferable only if backend is Python | 100% Python |

The only "live" computation is the user's slider changing the displayed stat, which is a pure function over already-loaded data — trivially client-side.

### Why Python for the precompute

- The user is a Python developer — they can write the script idiomatically
- Parallelism for calling Open-Meteo: `asyncio` + `httpx` or `aiohttp`
- GeoPandas + Shapely for shaping the output GeoJSON
- Nice `numpy`-based stats if we want to replicate our TS computation in Python (or we could call out to Node, but that's over-engineering)

## Architecture diagram

```
┌─────────────────────┐
│  Python precompute  │   (runs once a year, locally or via GitHub Action)
│  scripts/build_map  │
│        .py          │
└──────────┬──────────┘
           │
           │ calls ~1,500-3,000 times
           ▼
    ┌──────────────┐
    │  Open-Meteo  │
    │   archive    │
    └──────────────┘
           │
           ▼ writes
    public/map-data.json  (gzip ≈ 500 KB-2 MB)
           │
           │ shipped with the Vite build
           ▼
    ┌──────────────────────┐
    │  Browser (v2 / map)  │
    │                      │
    │  - loads GeoJSON     │
    │  - MapLibre renders  │
    │  - client-side recolor
    │    on slider change  │
    └──────────────────────┘
```

## Data resolution — open question

Three candidates for what a "region" on the map means:

| Option | Count | File size (est.) | Open-Meteo calls | Pros | Cons |
|---|---|---|---|---|---|
| **Département** | 96 | ~50 KB gzipped | 96 | Tiny, fast, recognizable | Coarse — loses Alps vs. valley variation within a département |
| **Regular grid (30 km)** | ~800 | ~400 KB gzipped | ~800 | Uniform resolution, captures terrain variation | Doesn't align with administrative borders, harder to click-through to a city |
| **Commune** | ~35,000 | ~20 MB raw, several MB gzipped | 35,000 | Finest detail, clickable → city | Payload too big, too many API calls, most communes have the same stats as their neighbors |

**Recommendation: start with département.** It's 96 Open-Meteo calls, ships a ~50 KB file, and France's départements are what users intuitively recognize. Upgrade to a grid later if it feels too coarse.

Alternative hybrid: **départements + a searchable list of cities** for click-through. The map handles geography; the sidebar handles point lookup.

## Data model

The static JSON looks roughly like:

```json
{
  "generatedAt": "2026-01-03",
  "startYear": 2000,
  "endYear": 2025,
  "regions": [
    {
      "code": "44",
      "name": "Loire-Atlantique",
      "lat": 47.3,
      "lon": -1.6,
      "stats": {
        "averageDoy": 72,
        "medianDoy": 68,
        "latestDoy": 110,
        "yearsWithFrost": 24,
        "yearsWithoutFrost": 2,
        "perYearDoys": [72, 68, 88, null, ...]
      }
    },
    ...
  ]
}
```

We store raw `perYearDoys` per region so client-side re-slicing (probability at a user-chosen date) works without re-fetching.

## Tech stack additions

### Frontend (React)
- **MapLibre GL JS** — free, open-source map rendering (vector tiles, WebGL). No API key.
- **Tile source**: OpenStreetMap via a free tile service, or MapTiler (free tier with attribution)
- **GeoJSON of French départements** — public-domain shapefile from IGN or data.gouv.fr
- **Color scale**: a perceptually-uniform gradient (e.g. Viridis or custom sage→tomato)

### Python precompute
- `httpx` or `aiohttp` — concurrent HTTP requests to Open-Meteo
- `numpy` — stats computation
- One script, <200 lines, runs in a minute or two

### CI
- **No scheduled rebuild**. The precompute script is run **manually**, by the
  developer, once a year (typically in early January when the previous year's
  data becomes stable in Open-Meteo's archive).
- Running it is a deliberate act: open the Python script, run it locally,
  review the diff to `public/map-data.json`, commit, push.
- Stays simple; avoids GHA billing / secret management / silent failures.

## UX flow

```
User lands on / (v1 card view, unchanged)
           │
           ├─ Search a city → v1 card (unchanged)
           │
           └─ Click "Map" button in header
                         │
                         ▼
              /map route loads map-data.json
                         │
                         ▼
              MapLibre renders départements, colored by median last-frost
                         │
                         ├─ Hover → tooltip with department stats
                         ├─ Click → navigate to /?city=<department capital>
                         ├─ Drag slider → map recolors by probability at date X
                         └─ Toggle metric → average / median / latest / probability
```

## File structure additions

```
scripts/
└── build_map.py             # NEW — precompute script

public/
├── map-data.json            # NEW — output of build_map.py (stats per dept)
├── departements.geojson     # NEW — polygon shapes (static, committed once)
└── departement-prefecture.json  # NEW — lookup: dept code → prefecture city

src/
├── routes/                  # NEW — introduce routing
│   ├── CityView.tsx         # moved: most of current App.tsx
│   └── MapView.tsx          # NEW — map page
├── components/
│   └── FranceMap.tsx        # NEW — MapLibre wrapper
└── lib/
    └── mapColors.ts         # NEW — color scale helpers

```

## Decisions (resolved)

1. **Resolution**: départements (96 regions). Upgrade to a finer grid later if
   regional variation feels too coarse.
2. **Routing**: **React Router**. `/` stays the single-city view; `/map` is
   the new map view. Real URLs mean the map view is bookmarkable and the
   browser back button works.
3. **Basemap / tile provider**: **none** for v2.0. We render the département
   polygons on a neutral background — the colored data *is* the visualization.
   Avoids any external tile service, API keys, or attribution requirements.
   Revisit once v2.0 ships if a basemap is missed.
4. **Click-through target**: **préfecture of the département**. Loire-Atlantique
   → Nantes, Bouches-du-Rhône → Marseille, etc. Ships as a static JSON
   mapping (96 entries, pulled from data.gouv.fr).
5. **Data storage**: **committed to `public/map-data.json`** in this repo. At
   département resolution the file is ~50 KB gzipped — negligible for git.
   Reconsider only if file size grows past ~5 MB.

## Success criteria

- User can load the map in <2s on a mid-tier mobile connection
- Hovering a département shows its stats within 50ms (no API call)
- Dragging the probability slider recolors the map in <16ms/frame (60fps)
- Works offline after first load (service worker optional for v2)
- Both language toggles and dark mode work on the map page
- Data refresh is a manual, once-a-year operation by the developer

## Stages

**v2.0** — départements colored by median last-frost, hover-tooltip, click-through to city view, French/English, dark/light. Ship the Python precompute script + annual GHA.

**v2.1** — probability-at-date slider on the map.

**v2.2** — metric selector (average / median / latest / probability).

**v2.3 (maybe)** — upgrade to 30 km grid.
