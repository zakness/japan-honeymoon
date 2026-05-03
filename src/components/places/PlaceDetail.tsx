import { useState } from 'react'
import {
  ExternalLink,
  Phone,
  MapPin,
  Star,
  Clock,
  Pencil,
  Trash2,
  CalendarPlus,
  MapPinOff,
  ChevronDown,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Lightbox } from '@/components/shared/Lightbox'
import { useLightbox } from '@/hooks/useLightbox'
import { PlaceForm } from './PlaceForm'
import { useDeletePlace } from '@/hooks/usePlaces'
import { useCreateItineraryItem, usePlaceSchedule } from '@/hooks/useItinerary'
import { PLACE_CATEGORIES, type PlaceRow, type PlacePriority } from '@/types/places'
import {
  CITY_LABELS,
  TRIP_DAYS,
  formatTripDate,
  formatTripDayLabel,
  type City,
} from '@/config/trip'

const PRIORITY_STYLES: Record<PlacePriority, string> = {
  'must-do': 'bg-red-100 text-red-700',
  'want-to': 'bg-blue-100 text-blue-700',
  'if-time': 'bg-gray-100 text-gray-600',
}

/** Parse "10:00 AM", "10:00", "10 AM" → minutes since midnight. */
function parseTimeToMinutes(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ampm = m[3]?.toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + min
}

/**
 * Derive a one-line open-now summary from Google's `weekdayDescriptions`
 * (Monday-first, 7 entries, e.g. "Monday: 10:00 AM – 10:30 PM" or "Monday: Closed").
 * Returns `null` if the shape is unexpected — caller falls back to plain "Hours".
 */
function getOpenStatus(
  weekdayDescriptions: string[],
  now: Date
): { openNow: boolean; label: string } | null {
  if (weekdayDescriptions.length !== 7) return null
  const jsDay = now.getDay() // 0=Sun, 1=Mon
  const idx = jsDay === 0 ? 6 : jsDay - 1 // Google is Monday-first
  const line = weekdayDescriptions[idx] ?? ''
  const rest = line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : line.trim()

  if (/closed/i.test(rest)) {
    for (let i = 1; i <= 7; i++) {
      const nextLine = weekdayDescriptions[(idx + i) % 7] ?? ''
      if (/closed/i.test(nextLine)) continue
      const nextRest = nextLine.includes(':')
        ? nextLine.slice(nextLine.indexOf(':') + 1).trim()
        : nextLine.trim()
      const openStr = nextRest.split(/[–-]/)[0]?.trim()
      if (openStr) return { openNow: false, label: `Closed · opens ${openStr}` }
      break
    }
    return { openNow: false, label: 'Closed' }
  }

  const parts = rest.split(/[–-]/).map((s) => s.trim())
  if (parts.length !== 2) return null
  const openMin = parseTimeToMinutes(parts[0])
  const closeMin = parseTimeToMinutes(parts[1])
  if (openMin == null || closeMin == null) return null

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const openNow =
    closeMin < openMin
      ? nowMin >= openMin || nowMin < closeMin // wraps past midnight
      : nowMin >= openMin && nowMin < closeMin
  return openNow
    ? { openNow: true, label: `Open · closes ${parts[1]}` }
    : { openNow: false, label: `Closed · opens ${parts[0]}` }
}

interface PlaceDetailContentProps {
  place: PlaceRow
  /** Called when user clicks Edit — opens the edit dialog at AppShell level. */
  onEdit: () => void
  /** Called after a successful delete so the parent can clear selection. */
  onClose?: () => void
}

/**
 * Read-only view of a place. Renders inside the shared `DetailPanel` (sibling
 * to the map) or a modal sheet — it doesn't own its own viewport positioning.
 * Edit is delegated upward via `onEdit`; delete + add-to-day are handled inline
 * because their affordances (AlertDialog, Popover) are scoped to the action.
 */
export function PlaceDetailContent({ place, onEdit, onClose }: PlaceDetailContentProps) {
  const [dayPickerOpen, setDayPickerOpen] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const lightbox = useLightbox()
  const deletePlace = useDeletePlace()
  const createItem = useCreateItineraryItem()
  const { data: scheduledDates = [] } = usePlaceSchedule(place.id)

  async function handleAddToDay(day: (typeof TRIP_DAYS)[number]) {
    try {
      await createItem.mutateAsync({ place_id: place.id, day_date: day.date, sort_order: 9999 })
      toast.success(`Added to ${formatTripDayLabel(day)}`)
      setDayPickerOpen(false)
    } catch {
      toast.error('Failed to add to day')
    }
  }

  async function handleDelete() {
    try {
      await deletePlace.mutateAsync(place.id)
      toast.success('Place deleted')
      onClose?.()
    } catch {
      toast.error('Failed to delete place')
    }
  }

  const category = PLACE_CATEGORIES.find((c) => c.value === place.category)
  const photos = Array.isArray(place.photos) ? (place.photos as string[]) : []
  const priority = place.priority as PlacePriority
  const hours = place.hours as { weekdayDescriptions?: string[] } | null
  const hasCoords = place.lat != null && place.lng != null

  return (
    <div className="flex flex-col">
      {/* Hero photo — full-bleed top of the card (clipped by card's rounded overflow). */}
      {photos.length > 0 && (
        <button
          type="button"
          onClick={() => lightbox.openAt(photos, 0)}
          className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={photos.length > 1 ? `Open photos (${photos.length})` : 'Open photo'}
        >
          <img src={photos[0]} alt={`${place.name} photo`} className="h-32 w-full object-cover" />
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
            {category && <category.icon size={20} className="shrink-0 text-muted-foreground" />}
            <h2 className="flex-1 text-lg font-semibold leading-tight">{place.name}</h2>
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open website"
                title={place.website}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Call ${place.phone}`}
                title={place.phone}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
            >
              {priority}
            </span>
            <Badge variant="secondary">{place.status}</Badge>
            {place.city && (
              <Badge variant="outline">{CITY_LABELS[place.city as City] ?? place.city}</Badge>
            )}
            {place.rating && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {place.rating.toFixed(1)}
                {place.price_level && (
                  <span className="ml-1 text-green-600">{'¥'.repeat(place.price_level)}</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* No-location state — subtle badge + fix button */}
        {!hasCoords && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPinOff className="h-3.5 w-3.5" />
              <span>No location — add one to see this place on the map.</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
              Add location
            </Button>
          </div>
        )}

        {/* Scheduled days */}
        {scheduledDates.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {[...new Set(scheduledDates)].map((date) => {
              const day = TRIP_DAYS.find((d) => d.date === date)
              if (!day) return null
              return (
                <Badge key={date} variant="secondary" className="text-xs gap-1">
                  <CalendarPlus className="h-3 w-3" />
                  {formatTripDayLabel(day)}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Address — clamped to one line by default, click to expand. Copy button sits inline. */}
        {place.address && (
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={() => setAddressOpen((v) => !v)}
              className="flex flex-1 items-start gap-2 text-left text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-expanded={addressOpen}
            >
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className={addressOpen ? '' : 'line-clamp-1'}>{place.address}</span>
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  await navigator.clipboard.writeText(place.address!)
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
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {place.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Hours — collapsed by default with an "open now" summary; expands to the full week. */}
        {hours?.weekdayDescriptions && hours.weekdayDescriptions.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setHoursOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-expanded={hoursOpen}
            >
              <Clock className="h-4 w-4" />
              {(() => {
                const status = getOpenStatus(hours.weekdayDescriptions ?? [], new Date())
                if (!status) return <span>Hours</span>
                return (
                  <span className={status.openNow ? 'text-green-600' : 'text-muted-foreground'}>
                    {status.label}
                  </span>
                )
              })()}
              <ChevronDown
                className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${
                  hoursOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {hoursOpen && (
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-5">
                {hours.weekdayDescriptions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Notes */}
        {place.notes && (
          <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{place.notes}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Popover open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
            <PopoverTrigger
              render={
                <Button size="sm" className="flex-1 gap-1.5">
                  <CalendarPlus className="h-4 w-4" />
                  Add to day
                </Button>
              }
            />
            <PopoverContent className="w-60 p-1" align="start">
              <div className="max-h-64 overflow-y-auto">
                {TRIP_DAYS.filter(
                  (day) => !place.city || day.cities.includes(place.city as City)
                ).map((day) => {
                  const already = scheduledDates.includes(day.date)
                  return (
                    <button
                      key={day.date}
                      className="w-full text-left px-2.5 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => handleAddToDay(day)}
                      disabled={createItem.isPending}
                    >
                      <span className="text-xs text-muted-foreground shrink-0 w-[4.5rem] tabular-nums">
                        {formatTripDate(day.date)}
                      </span>
                      <span className="flex-1">{day.label}</span>
                      {already && (
                        <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive gap-1.5"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete place?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{place.name}" will be permanently deleted and removed from all itineraries.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

interface PlaceEditDialogProps {
  /** When non-null, the dialog is open editing this place. */
  place: PlaceRow | null
  onOpenChange: (open: boolean) => void
  /**
   * Called with the saved row after a successful edit. AppShell uses this to
   * refresh the `selectedPlace` so the detail card shows the new data.
   */
  onSuccess?: (updated: PlaceRow) => void
}

/**
 * Centered modal wrapping `PlaceForm` for editing an existing place. Single
 * mount point at AppShell level; opening is driven by an `editingPlace` state
 * that `PlaceDetailContent` pokes via its `onEdit` callback.
 */
export function PlaceEditDialog({ place, onOpenChange, onSuccess }: PlaceEditDialogProps) {
  return (
    <Dialog open={!!place} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit place</DialogTitle>
        </DialogHeader>
        {place && (
          <PlaceForm
            place={place}
            onSuccess={(updated) => {
              onSuccess?.(updated)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
