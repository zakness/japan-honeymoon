import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/google-maps'
import type { PlaceRow } from '@/types/places'
import type { PlaceCategory } from '@/types/places'

interface PlaceMarkerProps {
  place: PlaceRow
  selected?: boolean
  dimmed?: boolean
  /** Number of days this place is scheduled on. When >= 1 a corner badge renders. */
  scheduledDayCount?: number
  onClick: (place: PlaceRow) => void
}

export function PlaceMarker({
  place,
  selected,
  dimmed,
  scheduledDayCount = 0,
  onClick,
}: PlaceMarkerProps) {
  if (!place.lat || !place.lng) return null

  const category = place.category as PlaceCategory
  const color = CATEGORY_COLORS[category] ?? '#6b7280'
  const icon = CATEGORY_ICONS[category] ?? '📍'
  const isScheduled = scheduledDayCount > 0

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      onClick={() => onClick(place)}
      zIndex={selected ? 10 : 1}
    >
      <div
        style={{
          transform: selected ? 'scale(1.25)' : 'scale(1)',
          opacity: dimmed ? 0.3 : 1,
          transition: 'transform 0.15s ease, opacity 0.15s ease',
        }}
        className="relative cursor-pointer"
      >
        <div
          style={{
            backgroundColor: selected ? '#1d4ed8' : color,
            transition: 'background-color 0.15s ease',
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md text-sm"
          title={place.name}
        >
          {icon}
        </div>
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
