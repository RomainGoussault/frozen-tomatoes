# Terminology

A glossary of the tools, concepts, and jargon used in this project — written for a Python developer learning the JS/TS ecosystem.

## Runtime & language

### Node.js
A JavaScript runtime — a program that executes `.js` files outside the browser.
**Python analogy:** like CPython is to Python. You run `node script.js` the way you'd run `python script.py`.
Needed here because all JS/TS *build tooling* (Vite, TypeScript compiler, Tailwind CLI) is itself written in JavaScript and runs on Node — even though the final site runs in a browser.

### JavaScript (JS)
The language browsers natively speak. Dynamic, loosely typed.

### TypeScript (TS)
JavaScript + a static type system. Code in `.ts` / `.tsx` files is **compiled to plain `.js`** before the browser runs it.
**Python analogy:** like Python with strict mypy, except the types are a first-class part of the language syntax and the toolchain.

### ESM (ES Modules)
The modern JS module system — `import x from "./y"` / `export function foo() {}`. Standardized, used natively by browsers and Vite. Replaces the older CommonJS (`require(...)`) style.

### JSX / TSX
A syntax extension that lets you write HTML-like tags inside JS/TS: `<div className="foo">{name}</div>`.
React uses it. `.tsx` = TypeScript + JSX. Compiled to normal function calls under the hood.

---

## Package management

### npm (Node Package Manager)
The default package manager, ships with Node. Installs packages from npmjs.com into `node_modules/`.
**Python analogy:** like `pip`.

### pnpm (Performant npm)
Faster, disk-efficient alternative to npm. Stores each package version once globally and hard-links it into projects.
**Python analogy:** like `uv` — same job, faster and smarter.

### yarn
Another npm alternative. Less relevant in 2026 than it used to be.

### Corepack
Tool bundled with Node that downloads and pins `pnpm` / `yarn` versions per-project, based on a `packageManager` field in `package.json`. Optional.

### nvm / fnm
**Node Version Managers.** Let you install multiple Node versions and switch between them per-project.
**Python analogy:** like `pyenv`. `fnm` is the faster Rust-based alternative to the original `nvm`.

### package.json
Manifest file listing project metadata, dependencies, and scripts.
**Python analogy:** like `pyproject.toml`.

### package-lock.json / pnpm-lock.yaml
Exact-version lockfile — pins every transitive dependency for reproducible installs. Commit it to git.
**Python analogy:** like `uv.lock` or `poetry.lock`.

### node_modules/
Folder where installed dependencies live. Can contain thousands of files. **Never commit it** (put in `.gitignore`).
**Python analogy:** like a project-local `venv/site-packages/`.

---

## Build tooling

### Vite
Dev server + production bundler. Serves your TS/React code during development with instant hot-reload, and bundles it into optimized static files for deployment.
Name is French for "fast," pronounced *veet*.

### Bundler
A tool that takes many source files (`.ts`, `.tsx`, `.css`, images) and combines them into a few optimized output files the browser can load efficiently. Vite uses **Rollup** internally for production builds.

### HMR (Hot Module Replacement)
When you save a file, the browser updates the changed module **without a full page reload** — component state is preserved. Vite's dev server provides this.

### esbuild
A very fast, low-level JS/TS compiler written in Go. Used internally by Vite for transforming individual files during dev.

### tsc (TypeScript Compiler)
The official TypeScript compiler. Checks types and emits `.js`. In practice, Vite uses esbuild for the actual transformation and only uses `tsc` for type-checking.

### Webpack
The older, slower, more complex bundler that Vite largely replaces. You'll see it mentioned in older tutorials.

---

## UI stack

### React
A library for building UIs out of **components** — reusable functions that return JSX. State lives in components via hooks (`useState`, `useEffect`).

### Tailwind CSS
A CSS framework where you style elements with **utility classes** directly in markup: `<div class="p-4 rounded-lg bg-white shadow">`. No separate CSS files for most things.
**Python analogy:** like using a well-designed stdlib of styles instead of writing your own helpers.

### shadcn/ui
Not a library — a collection of **pre-built React components** (buttons, inputs, dialogs, cards) that you *copy-paste into your project* and own. Built on Tailwind + Radix UI. Very clean, modern aesthetic.

### Radix UI
A set of **unstyled, accessible** component primitives (dropdowns, dialogs, tooltips). shadcn/ui wraps Radix primitives with Tailwind styles.

### Recharts
A React charting library. We'll use it for stats visualizations (histograms, timelines).

### Lucide
Icon set — clean, consistent SVG icons. The default icon pack for shadcn/ui.

### PostCSS
A tool that transforms CSS with plugins. Tailwind runs as a PostCSS plugin.

### Autoprefixer
PostCSS plugin that adds vendor prefixes (`-webkit-`, `-moz-`) to CSS automatically. Bundled with Tailwind setups.

---

## Hosting & deploy

### Vercel
Hosting platform optimized for frontend apps (especially React / Next.js). Free hobby tier, deploys automatically from GitHub on every push.

### Static site
A site made of pre-built HTML/CSS/JS files with no server-side code at runtime. Our v1 is a static site — all data fetching happens from the user's browser to Open-Meteo.

### Serverless function
A short-lived backend function that runs on-demand in a hosted environment (Vercel, Cloudflare Workers). No server to manage. We may use one in v2 for caching.

---

## Data

### Open-Meteo
Free weather API (no key required) providing historical and forecast weather data. CORS-enabled, so we can call it directly from the browser.

### ERA5 reanalysis
A global gridded weather dataset (~9km resolution) produced by running a physics model constrained by historical observations. Open-Meteo's historical data comes from ERA5.

### CORS (Cross-Origin Resource Sharing)
Browser security mechanism that controls which external domains a frontend page can make requests to. Open-Meteo explicitly allows all origins, which is why we can call it from our site.

---

## Project-specific

### frozen-tomatoes
This project's name. A play on (1) the goal of avoiding frost damage to tomato plants, and (2) the website style of Rotten Tomatoes. Gardeners want to plant tomatoes after the last frost — hence "frozen tomatoes" is the bad outcome we help avoid.

### Saints de glace
French folklore: May 11, 12, 13 (Saints Mamert, Pancrace, Servais) — traditionally the "last frost" dates. Our site replaces this rule-of-thumb with actual historical data per city.
