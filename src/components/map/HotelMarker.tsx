import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelMarkerProps {
  hotel: AccommodationRow
  selected?: boolean
  onClick: (hotel: AccommodationRow) => void
}

export function HotelMarker({ hotel, selected, onClick }: HotelMarkerProps) {
  if (!hotel.lat || !hotel.lng) return null

  return (
    <AdvancedMarker
      position={{ lat: hotel.lat, lng: hotel.lng }}
      onClick={() => onClick(hotel)}
      zIndex={selected ? 30 : 20}
    >
      <div
        style={{
          backgroundColor: selected ? '#5b21b6' : '#7c3aed',
          transform: selected ? 'scale(1.25)' : 'scale(1)',
          transition: 'transform 0.15s ease, background-color 0.15s ease',
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white shadow-md cursor-pointer text-base"
        title={hotel.name}
      >
        🏨
      </div>
    </AdvancedMarker>
  )
}
