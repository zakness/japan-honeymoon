import { formatReservationTime } from '@/types/itinerary'
import { CITY_LABELS, getHotelColor } from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelEntryProps {
  hotel: AccommodationRow
  kind: 'hotel_checkin' | 'hotel_checkout'
  allHotels: AccommodationRow[]
}

export function HotelEntry({ hotel, kind, allHotels }: HotelEntryProps) {
  const isCheckin = kind === 'hotel_checkin'
  const time = isCheckin ? hotel.check_in_time : hotel.check_out_time
  const cityLabel = CITY_LABELS[hotel.city as keyof typeof CITY_LABELS] ?? hotel.city
  const { tint: bgColor } = getHotelColor(hotel, allHotels)

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="text-base w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            🏨
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{hotel.name}</p>
            <p className="text-xs text-muted-foreground">{cityLabel}</p>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            isCheckin ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
          }`}
        >
          {isCheckin ? 'Check in' : 'Check out'}
          {time && ` · ${formatReservationTime(time)}`}
        </span>
      </div>

      {isCheckin && hotel.confirmation_numbers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hotel.confirmation_numbers.map((num) => (
            <span key={num} className="font-mono text-xs text-muted-foreground">
              # {num}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
