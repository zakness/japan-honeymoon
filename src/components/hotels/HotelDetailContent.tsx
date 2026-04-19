import { useState } from 'react'
import {
  Hotel as HotelIcon,
  ExternalLink,
  Phone,
  MapPin,
  Star,
  Pencil,
  Copy,
  Calendar,
  KeyRound,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbox } from '@/components/shared/Lightbox'
import { useLightbox } from '@/hooks/useLightbox'
import { useAccommodations } from '@/hooks/useAccommodations'
import { CITY_LABELS, getHotelColor, type City } from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime()
  const b = new Date(`${checkOut}T00:00:00Z`).getTime()
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)))
}

function formatDateShort(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatTimeHHMM(t: string | null): string | null {
  if (!t) return null
  return t.slice(0, 5)
}

interface HotelDetailContentProps {
  hotel: AccommodationRow
  /** Opens the edit dialog at AppShell level. */
  onEdit: () => void
}

/**
 * Read-only view of a hotel — mirrors `PlaceDetailContent` so place and hotel
 * cards feel like the same surface. Hotels skip add-to-day / delete (out of
 * scope) and replace "scheduled days" with a stay summary (dates + nights).
 */
export function HotelDetailContent({ hotel, onEdit }: HotelDetailContentProps) {
  const [addressOpen, setAddressOpen] = useState(false)
  const lightbox = useLightbox()
  const { data: allHotels = [] } = useAccommodations()

  const photos = Array.isArray(hotel.photos) ? (hotel.photos as string[]) : []
  const hasCoords = hotel.lat != null && hotel.lng != null
  const colors = getHotelColor(hotel, allHotels)
  const nights = nightsBetween(hotel.check_in_date, hotel.check_out_date)
  const checkInTime = formatTimeHHMM(hotel.check_in_time)
  const checkOutTime = formatTimeHHMM(hotel.check_out_time)

  return (
    <div className="flex flex-col">
      {photos.length > 0 && (
        <button
          type="button"
          onClick={() => lightbox.openAt(photos, 0)}
          className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={photos.length > 1 ? `Open photos (${photos.length})` : 'Open photo'}
        >
          <img src={photos[0]} alt={`${hotel.name} photo`} className="h-32 w-full object-cover" />
          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              +{photos.length - 1}
            </span>
          )}
        </button>
      )}

      <div className={`px-3 pb-3 space-y-3 ${photos.length > 0 ? 'pt-3' : 'pt-10'}`}>
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <HotelIcon size={20} className="shrink-0" style={{ color: colors.primary }} />
            <h2 className="flex-1 text-lg font-semibold leading-tight">{hotel.name}</h2>
            {hotel.website && (
              <a
                href={hotel.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open website"
                title={hotel.website}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {hotel.booking_url && (
              <a
                href={hotel.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open booking"
                title="Open booking"
              >
                <KeyRound className="h-4 w-4" />
              </a>
            )}
            {hotel.phone && (
              <a
                href={`tel:${hotel.phone}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Call ${hotel.phone}`}
                title={hotel.phone}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge
              variant="outline"
              style={{
                backgroundColor: colors.tint,
                color: colors.primary,
                borderColor: colors.primary,
              }}
            >
              {CITY_LABELS[hotel.city as City] ?? hotel.city}
            </Badge>
            {hotel.rating != null && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {hotel.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* No-location state */}
        {!hasCoords && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>No location — add one to see this hotel on the map.</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
              Add location
            </Button>
          </div>
        )}

        {/* Stay summary */}
        <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {formatDateShort(hotel.check_in_date)} → {formatDateShort(hotel.check_out_date)}
            </span>
            <span className="text-muted-foreground">
              · {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </div>
          {(checkInTime || checkOutTime) && (
            <div className="text-xs text-muted-foreground pl-6">
              {checkInTime && <span>Check-in {checkInTime}</span>}
              {checkInTime && checkOutTime && <span> · </span>}
              {checkOutTime && <span>Check-out {checkOutTime}</span>}
            </div>
          )}
          {hotel.booked_by && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Booked by {hotel.booked_by}
            </div>
          )}
          {hotel.confirmation_numbers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {hotel.confirmation_numbers.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs font-mono">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Address */}
        {hotel.address && (
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={() => setAddressOpen((v) => !v)}
              className="flex flex-1 items-start gap-2 text-left text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-expanded={addressOpen}
            >
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className={addressOpen ? '' : 'line-clamp-1'}>{hotel.address}</span>
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  await navigator.clipboard.writeText(hotel.address!)
                  toast.success('Address copied')
                } catch {
                  toast.error('Failed to copy')
                }
              }}
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Copy address"
              title="Copy address"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tags */}
        {hotel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hotel.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Notes */}
        {hotel.notes && (
          <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{hotel.notes}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
      <Lightbox
        open={lightbox.open}
        images={lightbox.images}
        startIndex={lightbox.startIndex}
        onClose={lightbox.close}
      />
    </div>
  )
}
