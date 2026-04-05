// Clickable suggestion chips shown before the user searches anything.
// Gives them a one-click way to see the tool in action.

import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

type Props = {
  onPick: (cityName: string) => void
}

const EXAMPLES = [
  'Paris',
  'Lyon',
  'Nantes',
  'Strasbourg',
  'Bordeaux',
  'Nice',
]

export function ExampleChips({ onPick }: Props) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-muted-foreground">{t('Try:')}</span>
      {EXAMPLES.map((city) => (
        <Button
          key={city}
          variant="outline"
          size="sm"
          onClick={() => onPick(city)}
          className="rounded-full"
        >
          {city}
        </Button>
      ))}
    </div>
  )
}
