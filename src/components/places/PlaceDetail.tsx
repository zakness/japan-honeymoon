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
import { PlaceForm } from './PlaceForm'
import { useDeletePlace } from '@/hooks/usePlaces'
import { useCreateItineraryItem, usePlaceSchedule } from '@/hooks/useItinerary'
import { PLACE_CATEGORIES, type PlaceRow, type PlacePriority } from '@/types/places'
import { CITY_LABELS, TRIP_DAYS, type City } from '@/config/trip'

const PRIORITY_STYLES: Record<PlacePriority, string> = {
  'must-do': 'bg-red-100 text-red-700',
  'want-to': 'bg-blue-100 text-blue-700',
  'if-time': 'bg-gray-100 text-gray-600',
}

interface PlaceDetailProps {
  place: PlaceRow
  onClose?: () => void
}

export function PlaceDetail({ place: initialPlace, onClose }: PlaceDetailProps) {
  const [editing, setEditing] = useState(false)
  const [place, setPlace] = useState(initialPlace)
  const [dayPickerOpen, setDayPickerOpen] = useState(false)
  const deletePlace = useDeletePlace()
  const createItem = useCreateItineraryItem()
  const { data: scheduledDates = [] } = usePlaceSchedule(place.id)

  async function handleAddToDay(day: (typeof TRIP_DAYS)[number]) {
    try {
      await createItem.mutateAsync({ place_id: place.id, day_date: day.date, sort_order: 9999 })
      toast.success(`Added to Day ${day.dayNumber} — ${day.label}`)
      setDayPickerOpen(false)
    } catch {
      toast.error('Failed to add to day')
    }
  }

  const category = PLACE_CATEGORIES.find((c) => c.value === place.category)
  const photos = Array.isArray(place.photos) ? (place.photos as string[]) : []
  const priority = place.priority as PlacePriority

  async function handleDelete() {
    try {
      await deletePlace.mutateAsync(place.id)
      toast.success('Place deleted')
      onClose?.()
    } catch {
      toast.error('Failed to delete place')
    }
  }

  if (editing) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Edit place</h3>
        <PlaceForm
          place={place}
          onSuccess={(updated) => {
            setPlace(updated)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  // Parse hours from JSONB — Google returns { weekdayDescriptions: string[] }
  const hours = place.hours as { weekdayDescriptions?: string[] } | null

  return (
    <div className="flex flex-col gap-4">
      {/* Photo carousel */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${place.name} photo ${i + 1}`}
              className="h-40 w-60 rounded-lg object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}

      <div className="px-1 space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            {category && <span className="text-xl">{category.icon}</span>}
            <h2 className="text-lg font-semibold leading-tight">{place.name}</h2>
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

        {/* Scheduled days */}
        {scheduledDates.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {[...new Set(scheduledDates)].map((date) => {
              const day = TRIP_DAYS.find((d) => d.date === date)
              if (!day) return null
              return (
                <Badge key={date} variant="secondary" className="text-xs gap-1">
                  <CalendarPlus className="h-3 w-3" />
                  Day {day.dayNumber} — {day.label}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Address */}
        {place.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{place.address}</span>
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

        {/* Hours */}
        {hours?.weekdayDescriptions && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Hours
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 pl-5">
              {hours.weekdayDescriptions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Website
            </a>
          )}
          {place.phone && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {place.phone}
            </span>
          )}
        </div>

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
            <PopoverContent className="w-52 p-1" align="start">
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
                      <span className="text-xs text-muted-foreground shrink-0 w-8">
                        Day {day.dayNumber}
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
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
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
    </div>
  )
}
