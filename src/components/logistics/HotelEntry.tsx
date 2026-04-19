import { Hotel, Pencil, Star } from 'lucide-react'
import { formatReservationTime } from '@/types/itinerary'
import { CITY_LABELS, getHotelColor } from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelEntryProps {
  hotel: AccommodationRow
  kind: 'hotel_checkin' | 'hotel_checkout'
  allHotels: AccommodationRow[]
  /** Opens the edit dialog at AppShell level. */
  onEdit?: (hotel: AccommodationRow) => void
}

export function HotelEntry({ hotel, kind, allHotels, onEdit }: HotelEntryProps) {
  const isCheckin = kind === 'hotel_checkin'
  const time = isCheckin ? hotel.check_in_time : hotel.check_out_time
  const cityLabel = CITY_LABELS[hotel.city as keyof typeof CITY_LABELS] ?? hotel.city
  const { tint: bgColor } = getHotelColor(hotel, allHotels)

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <Hotel size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{hotel.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{cityLabel}</span>
              {hotel.rating != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {hotel.rating.toFixed(1)}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isCheckin ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
            }`}
          >
            {isCheckin ? 'Check in' : 'Check out'}
            {time && ` · ${formatReservationTime(time)}`}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(hotel)}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Edit hotel"
              title="Edit hotel"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
