import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold tracking-tight">
        frozen tomatoes
      </h1>
      <p className="text-muted-foreground max-w-md text-center">
        Last frost dates for French cities, so you know when to plant.
      </p>
      <Button>Get started</Button>
    </main>
  )
}

export default App
