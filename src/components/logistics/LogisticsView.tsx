import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { TimelineGroup } from './TimelineGroup'
import { useFlights } from '@/hooks/useFlights'
import { useAccommodations } from '@/hooks/useAccommodations'
import { useAllJourneys } from '@/hooks/useTransport'
import { buildLogisticsTimeline, groupEntriesByDate } from '@/lib/logistics-utils'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'

interface LogisticsViewProps {
  onEditHotel?: (hotel: AccommodationRow) => void
  onEditJourney?: (journey: Journey) => void
}

export function LogisticsView({ onEditHotel, onEditJourney }: LogisticsViewProps) {
  const { data: flights = [], isLoading: flightsLoading } = useFlights()
  const { data: accommodations = [], isLoading: hotelsLoading } = useAccommodations()
  const { data: transport = [], isLoading: transportLoading } = useAllJourneys()

  const isLoading = flightsLoading || hotelsLoading || transportLoading

  const groups = useMemo(() => {
    const entries = buildLogisticsTimeline(flights, accommodations, transport)
    return groupEntriesByDate(entries)
  }, [flights, accommodations, transport])

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {groups.map(({ date, entries }) => (
          <TimelineGroup
            key={date}
            date={date}
            entries={entries}
            allHotels={accommodations}
            onEditHotel={onEditHotel}
            onEditJourney={onEditJourney}
          />
        ))}
      </div>
    </div>
  )
}
