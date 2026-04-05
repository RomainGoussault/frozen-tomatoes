// Root layout: fixed top-corner controls (theme + language + nav) and
// a footer, with the current route's content rendered between them.

import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Skeleton } from '@/components/ui/skeleton'
import { CityView } from '@/routes/CityView'

// Lazy-load the map route so MapLibre (~800 KB) isn't in the bundle for
// users who only visit "/". Browsers fetch the chunk only on /map.
const MapView = lazy(() =>
  import('@/routes/MapView').then((m) => ({ default: m.MapView })),
)

function App() {
  return (
    <div className="min-h-svh flex flex-col">
      <Header />
      <Routes>
        <Route path="/" element={<CityView />} />
        <Route
          path="/map"
          element={
            <Suspense fallback={<MapFallback />}>
              <MapView />
            </Suspense>
          }
        />
      </Routes>
      <Footer />
    </div>
  )
}

function MapFallback() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-6 pt-24">
      <Skeleton className="h-12 w-96 max-w-full" />
      <Skeleton className="h-[70vh] w-full max-w-4xl rounded-lg" />
    </main>
  )
}

export default App
