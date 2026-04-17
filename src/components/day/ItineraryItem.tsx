import { useState } from 'react'
import { StickyNote, Clock, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { PLACE_CATEGORIES, type PlaceRow } from '@/types/places'
import {
  type TimeSlot,
  type ItineraryItemWithPlace,
  formatReservationTime,
} from '@/types/itinerary'
import { getCityColor, getPrimaryCityForDate } from '@/config/trip'
import { useDeleteItineraryItem, useUpdateItineraryItem } from '@/hooks/useItinerary'
import { ReservationDialog } from './ReservationDialog'
import { TextNoteDialog } from './TextNoteDialog'
import { PlaceCardBanner } from '../places/PlaceCardBanner'
import {
  SortableItemCard,
  TimeSlotMenu,
  TimeSlotMenuItems,
  DeleteItemButton,
} from './SortableItemCard'

interface ItineraryItemProps {
  item: ItineraryItemWithPlace
  dayDate: string
  /**
   * Fires when the user clicks a scheduled place's name. The parent (DayColumn)
   * is expected to route this into AppShell's lifted selection handler with
   * `'day-column'` as the origin.
   */
  onSelectPlace?: (place: PlaceRow) => void
}

export function ItineraryItem({ item, dayDate, onSelectPlace }: ItineraryItemProps) {
  const deleteItem = useDeleteItineraryItem()
  const updateItem = useUpdateItineraryItem()
  const [reservationOpen, setReservationOpen] = useState(false)
  const [textNoteOpen, setTextNoteOpen] = useState(false)

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync({ id: item.id, dayDate })
    } catch {
      toast.error('Failed to remove item')
    }
  }

  async function handleTimeSlotChange(slot: TimeSlot) {
    try {
      await updateItem.mutateAsync({ id: item.id, time_slot: slot })
    } catch {
      toast.error('Failed to update time slot')
    }
  }

  async function handleToggleDecided() {
    try {
      await updateItem.mutateAsync({ id: item.id, is_decided: !item.is_decided })
    } catch {
      toast.error('Failed to update item')
    }
  }

  const isPlace = item.place !== null
  const place = item.place
  const category = place ? PLACE_CATEGORIES.find((c) => c.value === place.category) : null
  const timeSlot = item.time_slot as TimeSlot
  const city = getPrimaryCityForDate(item.day_date)
  const accentColor = city ? getCityColor(city).primary : undefined

  const placePhotos = place && Array.isArray(place.photos) ? (place.photos as string[]) : []
  const noteImages = Array.isArray(item.images) ? (item.images as string[]) : []

  // Place-backed items always get a banner (photo or city-tinted fallback) for
  // visual consistency with the backlog. Text-notes only get a banner when
  // they actually have images — a bare note shouldn't be forced into a tinted
  // block with no signal.
  let banner: React.ReactNode = undefined
  if (isPlace) {
    banner = (
      <PlaceCardBanner
        photoUrl={placePhotos[0]}
        city={city}
        icon={category?.icon ?? StickyNote}
        className="h-16"
      />
    )
  } else if (noteImages.length > 0) {
    banner = (
      <PlaceCardBanner photoUrl={noteImages[0]} city={city} icon={StickyNote} className="h-16" />
    )
  }

  const actions = (
    <>
      <TimeSlotMenu timeSlot={timeSlot}>
        {item.reservation_time ? (
          <DropdownMenuItem onClick={() => setReservationOpen(true)}>
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Edit reservation
          </DropdownMenuItem>
        ) : (
          <>
            {isPlace && (
              <>
                <DropdownMenuItem onClick={() => setReservationOpen(true)}>
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Set reservation time
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleToggleDecided}>
              {item.is_decided ? (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Mark as speculative
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Lock in
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <TimeSlotMenuItems current={timeSlot} onChange={handleTimeSlotChange} />
          </>
        )}
      </TimeSlotMenu>
      <DeleteItemButton onDelete={handleDelete} label="Remove item" />
    </>
  )

  return (
    <SortableItemCard
      id={item.id}
      data={{ dayDate, kind: 'itinerary' as const, timeSlot: item.time_slot }}
      actions={actions}
      variant={item.is_decided ? 'decided' : 'speculative'}
      accentColor={accentColor}
      banner={banner}
    >
      {isPlace && place ? (
        <div>
          <div className="flex items-center gap-1.5">
            {category && <category.icon size={14} className="shrink-0 text-muted-foreground" />}
            <button
              className="text-sm font-medium hover:underline text-left leading-tight"
              onClick={() => onSelectPlace?.(place)}
            >
              {place.name}
            </button>
          </div>
          {item.reservation_time && (
            <button
              className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              onClick={() => setReservationOpen(true)}
              title="Edit reservation"
            >
              <Clock className="h-3 w-3" />
              {formatReservationTime(item.reservation_time)}
            </button>
          )}
          {item.reservation_notes && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {item.reservation_notes}
            </p>
          )}
          <ReservationDialog item={item} open={reservationOpen} onOpenChange={setReservationOpen} />
        </div>
      ) : (
        <div>
          <div className="flex items-start gap-1.5">
            <StickyNote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <button
              className="text-sm text-left leading-tight hover:underline line-clamp-3"
              onClick={() => setTextNoteOpen(true)}
            >
              {item.text_note || <span className="text-muted-foreground italic">Empty note</span>}
            </button>
          </div>
          <TextNoteDialog item={item} open={textNoteOpen} onOpenChange={setTextNoteOpen} />
        </div>
      )}
    </SortableItemCard>
  )
}
