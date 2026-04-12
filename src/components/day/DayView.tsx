import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ListPlus } from 'lucide-react'
import { DaySelector } from './DaySelector'
import { DayItinerary } from './DayItinerary'
import { BacklogPanel } from './BacklogPanel'
import { AddItemDialog } from './AddItemDialog'
import { useItineraryItems } from '@/hooks/useItinerary'
import { useTripDays, usePrimaryCityForDate } from '@/hooks/useTripDays'
import { TRIP_DAYS } from '@/config/trip'
import type { NavState } from '@/components/layout/AppShell'

function getDefaultDate(): string {
  const today = new Date().toISOString().slice(0, 10)
  const inTrip = TRIP_DAYS.find((d) => d.date === today)
  return inTrip ? today : TRIP_DAYS[0].date
}

interface DayViewProps {
  initialDate?: string
  onNavigate: (state: NavState) => void
}

export function DayView({ initialDate, onNavigate }: DayViewProps) {
  const tripDays = useTripDays()
  const [selectedDate, setSelectedDate] = useState(initialDate ?? getDefaultDate())
  const [backlogOpen, setBacklogOpen] = useState(false)

  const { data: items = [] } = useItineraryItems(selectedDate)
  const primaryCity = usePrimaryCityForDate(selectedDate)
  const day = tripDays.find((d) => d.date === selectedDate)

  function handleSelectPlace(placeId: string) {
    onNavigate({ view: 'map', focusPlaceId: placeId })
  }

  function handleSelectHotel(hotelId: string) {
    onNavigate({ view: 'map', focusHotelId: hotelId })
  }

  return (
    <div className="flex flex-col h-full">
      <DaySelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div>
          <h2 className="font-semibold text-sm">{day?.label}</h2>
          <p className="text-xs text-muted-foreground">{selectedDate}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setBacklogOpen(true)}
          >
            <ListPlus className="h-4 w-4" />
            Backlog
          </Button>
          <AddItemDialog dayDate={selectedDate} currentItemCount={items.length} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="lg:flex lg:h-full">
          <div className="flex-1 overflow-y-auto p-4">
            <DayItinerary
              dayDate={selectedDate}
              onSelectPlace={handleSelectPlace}
              onSelectHotel={handleSelectHotel}
            />
          </div>
          <div className="hidden lg:block w-80 border-l overflow-y-auto p-4">
            <BacklogPanel
              dayDate={selectedDate}
              defaultCity={primaryCity}
              existingItemCount={items.length}
            />
          </div>
        </div>
      </div>

      <Sheet open={backlogOpen} onOpenChange={setBacklogOpen}>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Backlog</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <BacklogPanel
              dayDate={selectedDate}
              defaultCity={primaryCity}
              existingItemCount={items.length}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
