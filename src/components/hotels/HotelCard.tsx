import { ExternalLink } from 'lucide-react'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelCardProps {
  hotel: AccommodationRow
}

function formatDateRange(checkIn: string, checkOut: string) {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )
  return { range: `${fmt(checkIn)} – ${fmt(checkOut)}`, nights }
}

const CITY_LABELS: Record<string, string> = {
  tokyo: 'Tokyo',
  hakone: 'Hakone',
  kyoto: 'Kyoto',
  naoshima: 'Naoshima',
  osaka: 'Osaka',
}

export function HotelCard({ hotel }: HotelCardProps) {
  const { range, nights } = formatDateRange(hotel.check_in_date, hotel.check_out_date)
  const link = hotel.booking_url ?? hotel.website

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm leading-tight">{hotel.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {CITY_LABELS[hotel.city] ?? hotel.city}
          </p>
        </div>
        <span className="text-lg flex-shrink-0">🏨</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Dates</p>
          <p className="font-medium">{range}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Nights</p>
          <p className="font-medium">{nights}</p>
        </div>
        {hotel.booked_by && (
          <div>
            <p className="text-muted-foreground">Booked by</p>
            <p className="font-medium">{hotel.booked_by}</p>
          </div>
        )}
      </div>

      {hotel.confirmation_numbers.length > 0 && (
        <div className="text-xs">
          <p className="text-muted-foreground">
            {hotel.confirmation_numbers.length > 1 ? 'Confirmations' : 'Confirmation'}
          </p>
          {hotel.confirmation_numbers.map((num) => (
            <p key={num} className="font-mono font-medium">
              {num}
            </p>
          ))}
        </div>
      )}

      {hotel.address && (
        <div className="text-xs">
          <p className="text-muted-foreground">Address</p>
          <p className="font-medium">{hotel.address}</p>
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Manage reservation
        </a>
      )}
    </div>
  )
}
