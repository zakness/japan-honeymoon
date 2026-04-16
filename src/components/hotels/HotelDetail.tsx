import { ExternalLink, MapPin, CalendarDays, Hash, User, Hotel } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AccommodationRow } from '@/types/accommodations'
import { CITY_LABELS } from '@/config/trip'
import type { City } from '@/config/trip'

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

interface HotelDetailProps {
  hotel: AccommodationRow
}

export function HotelDetail({ hotel }: HotelDetailProps) {
  const nights = Math.round(
    (new Date(hotel.check_out_date).getTime() - new Date(hotel.check_in_date).getTime()) /
      (1000 * 60 * 60 * 24)
  )
  const link = hotel.booking_url ?? hotel.website

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1 space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Hotel size={20} className="shrink-0 text-muted-foreground" />
            <h2 className="text-lg font-semibold leading-tight">{hotel.name}</h2>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline">{CITY_LABELS[hotel.city as City] ?? hotel.city}</Badge>
            <Badge variant="secondary">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </Badge>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-start gap-2 text-sm">
          <CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <div>
            <p>
              <span className="text-muted-foreground">Check-in: </span>
              <span className="font-medium">{formatDate(hotel.check_in_date)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Check-out: </span>
              <span className="font-medium">{formatDate(hotel.check_out_date)}</span>
            </p>
          </div>
        </div>

        {/* Address */}
        {hotel.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{hotel.address}</span>
          </div>
        )}

        {/* Confirmation numbers */}
        {hotel.confirmation_numbers.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Hash className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">
                {hotel.confirmation_numbers.length > 1 ? 'Confirmations' : 'Confirmation'}
              </p>
              {hotel.confirmation_numbers.map((num) => (
                <p key={num} className="font-mono font-medium text-sm">
                  {num}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Booked by */}
        {hotel.booked_by && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Booked by </span>
              <span className="font-medium">{hotel.booked_by}</span>
            </span>
          </div>
        )}

        {/* Manage link */}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Manage reservation
          </a>
        )}
      </div>
    </div>
  )
}
