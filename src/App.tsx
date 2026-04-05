import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { geocodeCity, type GeocodedCity } from '@/lib/openmeteo'

// Three mutually exclusive states the result panel can be in.
// TS note: this is a discriminated union — like a Python enum where each
// variant can carry different data. The `kind` field discriminates them.
type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; city: GeocodedCity | null }

function App() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault() // stop the browser's default "reload page" behavior
    const trimmed = query.trim()
    if (!trimmed) return

    setStatus({ kind: 'loading' })
    try {
      const city = await geocodeCity(trimmed)
      setStatus({ kind: 'success', city })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-8 p-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          frozen tomatoes
        </h1>
        <p className="text-muted-foreground max-w-md">
          Last frost dates for French cities, so you know when to plant.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
        <Input
          placeholder="Nantes, Lyon, Strasbourg…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={status.kind === 'loading'}>
          {status.kind === 'loading' ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <ResultPanel status={status} />
    </main>
  )
}

function ResultPanel({ status }: { status: Status }) {
  if (status.kind === 'idle') return null
  if (status.kind === 'loading') return null // button already shows state

  if (status.kind === 'error') {
    return (
      <p className="text-destructive text-sm">{status.message}</p>
    )
  }

  // success
  if (!status.city) {
    return (
      <p className="text-muted-foreground text-sm">No city found.</p>
    )
  }

  const { name, admin1, country, latitude, longitude } = status.city
  return (
    <div className="text-center">
      <p className="text-lg font-medium">
        {name}
        {admin1 ? `, ${admin1}` : ''} — {country}
      </p>
      <p className="text-muted-foreground text-sm">
        {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
      </p>
    </div>
  )
}

export default App
