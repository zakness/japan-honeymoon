import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/google-maps'
import type { PlaceRow } from '@/types/places'
import type { PlaceCategory } from '@/types/places'

interface PlaceMarkerProps {
  place: PlaceRow
  selected?: boolean
  dimmed?: boolean
  onClick: (place: PlaceRow) => void
}

export function PlaceMarker({ place, selected, dimmed, onClick }: PlaceMarkerProps) {
  if (!place.lat || !place.lng) return null

  const category = place.category as PlaceCategory
  const color = CATEGORY_COLORS[category] ?? '#6b7280'
  const icon = CATEGORY_ICONS[category] ?? '📍'

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      onClick={() => onClick(place)}
      zIndex={selected ? 10 : 1}
    >
      <div
        style={{
          backgroundColor: selected ? '#1d4ed8' : color,
          transform: selected ? 'scale(1.25)' : 'scale(1)',
          opacity: dimmed ? 0.3 : 1,
          transition: 'transform 0.15s ease, background-color 0.15s ease, opacity 0.15s ease',
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md cursor-pointer text-sm"
        title={place.name}
      >
        {icon}
      </div>
    </AdvancedMarker>
  )
}
