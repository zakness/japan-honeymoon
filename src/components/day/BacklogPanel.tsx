import { useState } from 'react'
import { toast } from 'sonner'
import { PlaceCard } from '@/components/places/PlaceCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useUnscheduledPlaces, useCreateItineraryItem } from '@/hooks/useItinerary'
import { CITY_LABELS, type City } from '@/config/trip'
import { TIME_SLOTS, type TimeSlot } from '@/types/itinerary'
import type { PlaceRow } from '@/types/places'

const ALL = 'all'

interface BacklogPanelProps {
  dayDate: string
  defaultCity?: City
  existingItemCount: number
}

export function BacklogPanel({ dayDate, defaultCity, existingItemCount }: BacklogPanelProps) {
  const { data: unscheduled = [], isLoading } = useUnscheduledPlaces()
  const createItem = useCreateItineraryItem()
  const [cityFilter, setCityFilter] = useState<City | typeof ALL>(defaultCity ?? ALL)
  const [addingId, setAddingId] = useState<string | null>(null)

  const filtered = cityFilter === ALL
    ? unscheduled
    : unscheduled.filter((p) => p.city === cityFilter)

  async function handleQuickAdd(place: PlaceRow, timeSlot: TimeSlot) {
    setAddingId(place.id)
    try {
      await createItem.mutateAsync({
        day_date: dayDate,
        place_id: place.id,
        time_slot: timeSlot,
        sort_order: existingItemCount,
      })
      toast.success(`${place.name} added to ${timeSlot}`)
    } catch {
      toast.error('Failed to add place')
    } finally {
      setAddingId(null)
    }
  }

  const cities = Object.entries(CITY_LABELS) as [City, string][]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Backlog</h3>
        <Select value={cityFilter} onValueChange={(v) => setCityFilter(v as City | typeof ALL)}>
          <SelectTrigger className="h-7 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cities</SelectItem>
            {cities.map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          {unscheduled.length === 0
            ? 'All places are scheduled!'
            : 'No unscheduled places in this city.'}
        </p>
      )}

      <div className="space-y-1.5">
        {filtered.map((place) => (
          <div key={place.id} className="space-y-1">
            <PlaceCard place={place} compact />
            <div className="flex gap-1 pl-1">
              {TIME_SLOTS.map((slot) => (
                <Button
                  key={slot.value}
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs flex-1 px-1"
                  disabled={addingId === place.id}
                  onClick={() => handleQuickAdd(place, slot.value)}
                >
                  + {slot.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
