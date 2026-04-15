import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/google-maps'
import { usePlaceSchedule } from '@/hooks/useItinerary'
import { formatTripDayLabel, getDayByDate } from '@/config/trip'
import type { PlaceRow, PlaceCategory } from '@/types/places'

interface PlaceInfoWindowProps {
  place: PlaceRow
}

export function PlaceInfoWindow({ place }: PlaceInfoWindowProps) {
  const { data: scheduledDates = [] } = usePlaceSchedule(place.id)

  const category = place.category as PlaceCategory
  const icon = CATEGORY_ICONS[category] ?? '📍'
  const label = CATEGORY_LABELS?.[category] ?? category

  return (
    <div className="min-w-[140px] max-w-[200px] space-y-1.5 py-0.5">
      <p className="text-sm font-semibold leading-tight">{place.name}</p>
      <p className="text-xs text-muted-foreground">
        {icon} {label}
      </p>
      {scheduledDates.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground">Scheduled:</p>
          {scheduledDates.map((date) => {
            const day = getDayByDate(date)
            return (
              <p key={date} className="pl-1">
                {day ? formatTripDayLabel(day) : date}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}
