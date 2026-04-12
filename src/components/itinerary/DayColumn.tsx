import { Skeleton } from '@/components/ui/skeleton'
import { TimeSlotGroup } from '@/components/day/TimeSlotGroup'
import { AddItemDialog } from '@/components/day/AddItemDialog'
import { useItineraryItems } from '@/hooks/useItinerary'
import { useTransportItems } from '@/hooks/useTransport'
import { useFlights } from '@/hooks/useFlights'
import { useAccommodations, useAccommodationsForDate } from '@/hooks/useAccommodations'
import { getHotelColor, getHotelBgColor } from '@/lib/hotel-colors'
import { mergeSlotItems } from '@/lib/transport-utils'
import { getFlightEventsForDate } from '@/lib/logistics-utils'
import { TIME_SLOTS, deriveTimeSlot } from '@/types/itinerary'
import { getDayByDate } from '@/config/trip'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayColumnProps {
  dayDate: string
}

export function DayColumn({ dayDate }: DayColumnProps) {
  const { data: itineraryItems = [], isLoading: itineraryLoading } = useItineraryItems(dayDate)
  const { data: transportItems = [], isLoading: transportLoading } = useTransportItems(dayDate)
  const { data: flights = [], isLoading: flightsLoading } = useFlights()
  const { morningHotel, eveningHotel } = useAccommodationsForDate(dayDate)
  const { data: allHotels = [] } = useAccommodations()

  const isLoading = itineraryLoading || transportLoading || flightsLoading

  const flightEvents = getFlightEventsForDate(flights, dayDate)
  const flightEventsBySlot = {
    morning: flightEvents.filter((e) => deriveTimeSlot(e.localTime) === 'morning'),
    afternoon: flightEvents.filter((e) => deriveTimeSlot(e.localTime) === 'afternoon'),
    evening: flightEvents.filter((e) => deriveTimeSlot(e.localTime) === 'evening'),
  }

  const grouped = mergeSlotItems(itineraryItems, transportItems)
  const totalItemCount = itineraryItems.length + transportItems.length

  const day = getDayByDate(dayDate)
  const date = new Date(dayDate + 'T00:00:00')
  const dayName = DAY_NAMES[date.getDay()]
  const dayNum = date.getDate()
  const isTransit = day?.isTransit ?? false

  return (
    <div className="w-64 shrink-0 flex flex-col border-r last:border-r-0 h-full">
      {/* Column header */}
      <div className="px-3 py-2.5 border-b bg-background shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{dayName}</span>
          <span className="text-lg font-bold leading-none">{dayNum}</span>
        </div>
        {isTransit && day && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{day.label}</p>
        )}
      </div>

      {/* Column body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </>
        ) : (
          <>
            {TIME_SLOTS.map(({ value, label }) => {
              const anchor =
                value === 'morning' ? morningHotel : value === 'evening' ? eveningHotel : null
              return (
                <TimeSlotGroup
                  key={value}
                  slot={value}
                  label={label}
                  items={grouped[value]}
                  dayDate={dayDate}
                  flightEvents={flightEventsBySlot[value]}
                  hotelAnchor={anchor}
                  hotelColor={anchor ? getHotelColor(anchor, allHotels) : undefined}
                  hotelBgColor={anchor ? getHotelBgColor(anchor, allHotels) : undefined}
                />
              )
            })}
          </>
        )}
      </div>

      {/* Add item footer */}
      <div className="px-2 py-2 border-t shrink-0">
        <AddItemDialog dayDate={dayDate} currentItemCount={totalItemCount} />
      </div>
    </div>
  )
}
