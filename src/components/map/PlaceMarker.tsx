import { MapPin } from 'lucide-react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { CATEGORY_COLORS } from '@/lib/google-maps'
import { PLACE_CATEGORIES, type PlaceRow, type PlaceCategory } from '@/types/places'

interface PlaceMarkerProps {
  place: PlaceRow
  selected?: boolean
  /** Number of days this place is scheduled on. When >= 1 a corner badge renders. */
  scheduledDayCount?: number
  onClick: (place: PlaceRow) => void
}

export function PlaceMarker({ place, selected, scheduledDayCount = 0, onClick }: PlaceMarkerProps) {
  if (!place.lat || !place.lng) return null

  const category = place.category as PlaceCategory
  const color = CATEGORY_COLORS[category] ?? '#6b7280'
  const Icon = PLACE_CATEGORIES.find((c) => c.value === category)?.icon ?? MapPin
  const isScheduled = scheduledDayCount > 0

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      onClick={() => onClick(place)}
      zIndex={selected ? 9999 : 1}
    >
      <div
        style={{
          transform: selected ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}
        className="relative cursor-pointer"
      >
        <div
          style={{
            backgroundColor: color,
            // Selected: thick white halo + softer outer shadow to lift it visually.
            boxShadow: selected
              ? '0 0 0 3px rgba(255,255,255,0.95), 0 4px 10px rgba(0,0,0,0.25)'
              : '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.15s ease',
          }}
          className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-sm"
          title={place.name}
        >
          <Icon size={14} color="white" />
        </div>
        {selected && (
          <div
            className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-xs font-medium text-foreground shadow-md ring-1 ring-black/5"
            aria-hidden
          >
            {place.name}
          </div>
        )}
        {isScheduled && (
          <div
            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-white bg-black px-0.75 text-[9px] font-semibold leading-none text-white shadow-sm tabular-nums"
            aria-label={`Scheduled on ${scheduledDayCount} day${scheduledDayCount === 1 ? '' : 's'}`}
          >
            {scheduledDayCount}
          </div>
        )}
      </div>
    </AdvancedMarker>
  )
}
