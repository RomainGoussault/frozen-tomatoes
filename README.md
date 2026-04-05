# frozen-tomatoes

**Live:** https://frozen-tomatoes.vercel.app

Last-frost statistics for French cities — helping gardeners decide when it's safe to plant frost-sensitive vegetables.

Enter a French city, get:

- Average / median / latest date of the last sub-0°C day each year, over the last 20 years
- A scatter chart showing year-to-year variability
- An interactive probability slider: *"chance of frost after date X"*

Data comes from [Open-Meteo](https://open-meteo.com/) (ERA5 reanalysis, free, no API key).

## Stack

Vite · TypeScript · React 19 · Tailwind CSS v4 · shadcn/ui · Recharts · Vitest

## Running locally

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev        # dev server at http://localhost:5173
pnpm test       # run tests in watch mode
pnpm build      # type-check + build to dist/
pnpm lint       # ESLint
```

## Project structure

```
src/
├── App.tsx               # root component + StatsCard
├── components/
│   ├── CitySearch.tsx    # autocomplete search
│   ├── FrostChart.tsx    # scatter chart
│   └── ui/               # shadcn components
├── lib/
│   ├── openmeteo.ts      # typed Open-Meteo client
│   ├── stats.ts          # pure frost-stats computation
│   └── hooks.ts          # useDebouncedValue
└── test/setup.ts         # jsdom polyfills
```

## Notes

- French cities only (`countryCode=FR` in the geocoding query)
- Cutoff: frost occurring strictly before July 1 each year
- 20-year window, excluding the current (incomplete) year
- Open-Meteo data is model reanalysis (~9km grid), not physical stations — fine for gardening-scale decisions
