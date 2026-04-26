import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TimeSlotGroup } from '@/components/day/TimeSlotGroup'
import { AddItemDialog } from '@/components/day/AddItemDialog'
import { useItineraryItems } from '@/hooks/useItinerary'
import { useJourneysForDay } from '@/hooks/useTransport'
import { useFlights } from '@/hooks/useFlights'
import { HotelAnchor } from '@/components/day/HotelAnchor'
import { useAccommodations, useAccommodationsForDate } from '@/hooks/useAccommodations'
import { getCityColor, getDayByDate, getHotelColor } from '@/config/trip'
import { mergeSlotItems } from '@/lib/transport-utils'
import { getFlightEventsForDate } from '@/lib/logistics-utils'
import { TIME_SLOTS, deriveTimeSlot, type TimeSlot } from '@/types/itinerary'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayColumnProps {
  dayDate: string
  /**
   * Fires when a user clicks a scheduled place's name inside one of the time
   * slots. Gets routed up to AppShell's unified selection handler with the
   * `'day-column'` origin baked in by ItineraryView.
   */
  onSelectPlace?: (place: PlaceRow) => void
  /** Fires when the user clicks a hotel anchor — selects the hotel on the map. */
  onSelectHotel?: (hotel: AccommodationRow) => void
  /** Fires when the user clicks a transport card's title — selects the journey on the map. */
  onSelectJourney?: (journey: Journey) => void
  /**
   * When true, the column fills its parent's width and drops the right border
   * (used by the mobile day-tab layout where only one column is visible at a
   * time). Default false — desktop renders columns side-by-side at fixed
   * width inside a horizontal scroller.
   */
  fillWidth?: boolean
}

export function DayColumn({
  dayDate,
  onSelectPlace,
  onSelectHotel,
  onSelectJourney,
  fillWidth = false,
}: DayColumnProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogInitialSlot, setDialogInitialSlot] = useState<TimeSlot>('morning')

  const { data: itineraryItems = [], isLoading: itineraryLoading } = useItineraryItems(dayDate)
  const { data: transportItems = [], isLoading: transportLoading } = useJourneysForDay(dayDate)
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
    <div
      className={cn(
        'flex flex-col h-full',
        fillWidth
          ? 'w-full rounded-xl border bg-background shadow-sm overflow-hidden'
          : 'w-64 shrink-0 border-r last:border-r-0'
      )}
    >
      {/* Column header — desktop only. On mobile the DayStrip shows the
          selected day, so a second day label here would be redundant. */}
      {!fillWidth && (
        <div
          className="px-3 py-2 border-b shrink-0 flex items-baseline gap-1.5"
          style={headerBg ? { background: headerBg } : undefined}
        >
          <span className="text-xs font-medium text-muted-foreground">{dayName}</span>
          <span className="text-lg font-bold leading-none">{dayNum}</span>
        </div>
      )}

      {/* Body. On mobile (`fillWidth`), hotel banners sit flush to the card
          edges and the time-slots area is its own scroll container with white
          padding. On desktop, the original single scroll body with hotels
          inline is preserved. */}
      {fillWidth ? (
        <>
          {!isLoading && morningHotel && (
            <HotelAnchor
              hotel={morningHotel}
              slot="morning"
              colors={getHotelColor(morningHotel, allHotels)}
              onSelect={onSelectHotel}
              bleed
            />
          )}
          <div className="flex-1 overflow-y-auto bg-background px-2 py-3 space-y-4 min-h-0">
            {isLoading ? (
              <>
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </>
            ) : (
              TIME_SLOTS.map(({ value, label }) => (
                <TimeSlotGroup
                  key={value}
                  slot={value}
                  label={label}
                  items={grouped[value]}
                  dayDate={dayDate}
                  flightEvents={flightEventsBySlot[value]}
                  onSelectPlace={onSelectPlace}
                  onSelectJourney={onSelectJourney}
                  onAddClick={(clickedSlot) => {
                    setDialogInitialSlot(clickedSlot)
                    setDialogOpen(true)
                  }}
                />
              ))
            )}
          </div>
          {!isLoading && eveningHotel && (
            <HotelAnchor
              hotel={eveningHotel}
              slot="evening"
              colors={getHotelColor(eveningHotel, allHotels)}
              onSelect={onSelectHotel}
              bleed
            />
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 min-h-0">
          {isLoading ? (
            <>
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </>
          ) : (
            <>
              {morningHotel && (
                <HotelAnchor
                  hotel={morningHotel}
                  slot="morning"
                  colors={getHotelColor(morningHotel, allHotels)}
                  onSelect={onSelectHotel}
                />
              )}
              {TIME_SLOTS.map(({ value, label }) => (
                <TimeSlotGroup
                  key={value}
                  slot={value}
                  label={label}
                  items={grouped[value]}
                  dayDate={dayDate}
                  flightEvents={flightEventsBySlot[value]}
                  onSelectPlace={onSelectPlace}
                  onSelectJourney={onSelectJourney}
                  onAddClick={(clickedSlot) => {
                    setDialogInitialSlot(clickedSlot)
                    setDialogOpen(true)
                  }}
                />
              ))}
              {eveningHotel && (
                <HotelAnchor
                  hotel={eveningHotel}
                  slot="evening"
                  colors={getHotelColor(eveningHotel, allHotels)}
                  onSelect={onSelectHotel}
                />
              )}
            </>
          )}
        </div>
      )}

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
