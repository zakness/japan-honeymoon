import { FlightEntry } from './FlightEntry'
import { HotelEntry } from './HotelEntry'
import { TransportEntry } from './TransportEntry'
import type { LogisticsEntry } from '@/lib/logistics-utils'
import type { AccommodationRow } from '@/types/accommodations'
import { getHotelColor } from '@/config/trip'

function formatGroupDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

interface TimelineGroupProps {
  date: string
  entries: LogisticsEntry[]
  allHotels: AccommodationRow[]
  onEditHotel?: (hotel: AccommodationRow) => void
}

export function TimelineGroup({ date, entries, allHotels, onEditHotel }: TimelineGroupProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {formatGroupDate(date)}
      </h2>
      <div className="relative border-l-2 border-border ml-1 pl-4 space-y-2">
        {entries.map((entry, i) => {
          const dotColor =
            entry.kind === 'hotel_checkin' || entry.kind === 'hotel_checkout'
              ? getHotelColor(entry.data, allHotels).primary
              : undefined
          return (
            <div key={`${entry.kind}-${entry.data.id}-${i}`} className="relative">
              <div
                className="absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full bg-border ring-2 ring-background"
                style={dotColor ? { backgroundColor: dotColor } : undefined}
              />
              {entry.kind === 'flight' && <FlightEntry flight={entry.data} />}
              {(entry.kind === 'hotel_checkin' || entry.kind === 'hotel_checkout') && (
                <HotelEntry
                  hotel={entry.data}
                  kind={entry.kind}
                  allHotels={allHotels}
                  onEdit={onEditHotel}
                />
              )}
              {entry.kind === 'transport' && <TransportEntry item={entry.data} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
