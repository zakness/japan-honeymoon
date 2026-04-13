import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { getHotelColor } from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelMarkerProps {
  hotel: AccommodationRow
  allHotels: AccommodationRow[]
  selected?: boolean
  dimmed?: boolean
  onClick: (hotel: AccommodationRow) => void
}

export function HotelMarker({ hotel, allHotels, selected, dimmed, onClick }: HotelMarkerProps) {
  if (!hotel.lat || !hotel.lng) return null

  const { primary } = getHotelColor(hotel, allHotels)

  return (
    <AdvancedMarker
      position={{ lat: hotel.lat, lng: hotel.lng }}
      onClick={() => onClick(hotel)}
      zIndex={selected ? 30 : 20}
    >
      <div
        style={{
          backgroundColor: primary,
          transform: selected ? 'scale(1.25)' : 'scale(1)',
          opacity: dimmed ? 0.3 : 1,
          // Add a 3px white ring outside the existing white border on selection.
          boxShadow: selected
            ? '0 0 0 3px rgba(255, 255, 255, 0.95), 0 2px 4px rgba(0,0,0,0.15)'
            : '0 2px 4px rgba(0,0,0,0.15)',
          transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white cursor-pointer text-base"
        title={hotel.name}
      >
        🏨
      </div>
    </AdvancedMarker>
  )
}
