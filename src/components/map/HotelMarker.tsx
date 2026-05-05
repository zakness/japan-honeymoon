import { Hotel } from 'lucide-react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { getHotelColor } from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelMarkerProps {
  hotel: AccommodationRow
  allHotels: AccommodationRow[]
  selected?: boolean
  onClick: (hotel: AccommodationRow) => void
}

export function HotelMarker({ hotel, allHotels, selected, onClick }: HotelMarkerProps) {
  if (!hotel.lat || !hotel.lng) return null

  const { primary } = getHotelColor(hotel, allHotels)

  return (
    <AdvancedMarker
      position={{ lat: hotel.lat, lng: hotel.lng }}
      onClick={() => onClick(hotel)}
      zIndex={selected ? 9999 : 20}
    >
      <div
        className="relative"
        style={{
          transform: selected ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          style={{
            backgroundColor: primary,
            // Selected: thick white halo + softer outer shadow to lift it visually.
            boxShadow: selected
              ? '0 0 0 3px rgba(255,255,255,0.95), 0 4px 10px rgba(0,0,0,0.25)'
              : '0 2px 4px rgba(0,0,0,0.15)',
            transition: 'box-shadow 0.15s ease',
          }}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white cursor-pointer text-base"
          title={hotel.name}
        >
          <Hotel size={16} color="white" />
        </div>
        {selected && (
          <div
            className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-xs font-medium text-foreground shadow-md ring-1 ring-black/5"
            aria-hidden
          >
            {hotel.name}
          </div>
        )}
      </div>
    </AdvancedMarker>
  )
}
