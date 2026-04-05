// Placeholder card shown while stats are loading. The shapes mirror
// StatsCard's real layout so the transition feels smooth.

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StatsCardSkeleton() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-3 w-64 mx-auto" />
      </CardContent>
    </Card>
  )
}
