import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import { LangProvider } from './lib/i18n.tsx'
import { prefetchCityData } from './lib/prefetch.ts'

// If the URL has ?city=..., kick off the fetch immediately — before React
// even starts — so the data is (ideally) ready by the time App mounts.
// (Only useful on the "/" route; harmless on "/map".)
const urlCity = new URLSearchParams(window.location.search).get('city')?.trim()
if (urlCity && window.location.pathname === '/') {
  const endYear = new Date().getFullYear() - 1
  prefetchCityData(urlCity, 2000, endYear)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <App />
          <Analytics />
          <SpeedInsights />
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>,
)
