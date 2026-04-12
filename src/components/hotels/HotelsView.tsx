import { Skeleton } from '@/components/ui/skeleton'
import { useAccommodations } from '@/hooks/useAccommodations'
import { HotelCard } from './HotelCard'
import type { NavState } from '@/components/layout/AppShell'

interface HotelsViewProps {
  onNavigate: (state: NavState) => void
}

export function HotelsView({ onNavigate }: HotelsViewProps) {
  const { data: hotels = [], isLoading } = useAccommodations()

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {hotels.length} {hotels.length === 1 ? 'hotel' : 'hotels'}
        </h2>
        {hotels.map((hotel) => (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            onViewOnMap={() => onNavigate({ view: 'map', focusHotelId: hotel.id })}
          />
        ))}
      </div>
    </div>
  )
}
