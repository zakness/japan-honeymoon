import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { TimeSlotGroup } from '@/components/day/TimeSlotGroup'
import { AddItemDialog } from '@/components/day/AddItemDialog'
import { useItineraryItems } from '@/hooks/useItinerary'
import { useTransportItems } from '@/hooks/useTransport'
import { useFlights } from '@/hooks/useFlights'
import { useAccommodations, useAccommodationsForDate } from '@/hooks/useAccommodations'
import { getCityColor, getDayByDate, getHotelColor } from '@/config/trip'
import { mergeSlotItems } from '@/lib/transport-utils'
import { getFlightEventsForDate } from '@/lib/logistics-utils'
import { TIME_SLOTS, deriveTimeSlot, type TimeSlot } from '@/types/itinerary'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayColumnProps {
  dayDate: string
}

export function DayColumn({ dayDate }: DayColumnProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogInitialSlot, setDialogInitialSlot] = useState<TimeSlot>('morning')

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

  const date = new Date(dayDate + 'T00:00:00')
  const dayName = DAY_NAMES[date.getDay()]
  const dayNum = date.getDate()

  // Header background: solid city tint for single-city days, hard left/right
  // split (origin → destination) for transit days.
  const day = getDayByDate(dayDate)
  const headerBg = (() => {
    if (!day || day.cities.length === 0) return undefined
    if (day.cities.length === 1) return getCityColor(day.cities[0]).tint
    const origin = getCityColor(day.cities[0]).tint
    const destination = getCityColor(day.cities[day.cities.length - 1]).tint
    return `linear-gradient(to right, ${origin} 0%, ${origin} 50%, ${destination} 50%, ${destination} 100%)`
  })()

  return (
    <div className="w-64 shrink-0 flex flex-col border-r last:border-r-0 h-full">
      {/* Column header */}
      <div
        className="px-3 py-2 border-b shrink-0 flex items-baseline gap-1.5"
        style={headerBg ? { background: headerBg } : undefined}
      >
        <span className="text-xs font-medium text-muted-foreground">{dayName}</span>
        <span className="text-lg font-bold leading-none">{dayNum}</span>
      </div>

      {/* Column body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 min-h-0">
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
                  hotelColors={anchor ? getHotelColor(anchor, allHotels) : undefined}
                  onAddClick={(clickedSlot) => {
                    setDialogInitialSlot(clickedSlot)
                    setDialogOpen(true)
                  }}
                />
              )
            })}
          </>
        )}
      </div>

      <AddItemDialog
        dayDate={dayDate}
        currentItemCount={totalItemCount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialSlot={dialogInitialSlot}
      />
    </div>
  )
}
