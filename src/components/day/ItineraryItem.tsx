import { useState } from 'react'
import { MapPin, StickyNote, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { PLACE_CATEGORIES } from '@/types/places'
import {
  type TimeSlot,
  type ItineraryItemWithPlace,
  formatReservationTime,
} from '@/types/itinerary'
import { useDeleteItineraryItem, useUpdateItineraryItem } from '@/hooks/useItinerary'
import { ReservationDialog } from './ReservationDialog'
import {
  SortableItemCard,
  TimeSlotMenu,
  TimeSlotMenuItems,
  DeleteItemButton,
} from './SortableItemCard'

interface ItineraryItemProps {
  item: ItineraryItemWithPlace
  dayDate: string
  onSelectPlace?: (placeId: string) => void
}

export function ItineraryItem({ item, dayDate, onSelectPlace }: ItineraryItemProps) {
  const deleteItem = useDeleteItineraryItem()
  const updateItem = useUpdateItineraryItem()
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(item.text_note ?? '')
  const [reservationOpen, setReservationOpen] = useState(false)

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync({ id: item.id, dayDate })
    } catch {
      toast.error('Failed to remove item')
    }
  }

  async function handleSaveNote() {
    try {
      await updateItem.mutateAsync({ id: item.id, text_note: noteText })
      setEditingNote(false)
    } catch {
      toast.error('Failed to update note')
    }
  }

  async function handleTimeSlotChange(slot: TimeSlot) {
    try {
      await updateItem.mutateAsync({ id: item.id, time_slot: slot })
    } catch {
      toast.error('Failed to update time slot')
    }
  }

  const isPlace = item.place !== null
  const place = item.place
  const category = place ? PLACE_CATEGORIES.find((c) => c.value === place.category) : null
  const timeSlot = item.time_slot as TimeSlot

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
    >
      {isPlace && place ? (
        <div>
          <div className="flex items-center gap-1.5">
            {category && <span className="text-sm">{category.icon}</span>}
            <button
              className="text-sm font-medium hover:underline text-left leading-tight"
              onClick={() => onSelectPlace?.(place.id)}
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
          {place.address && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{place.address}</span>
            </div>
          )}
          <ReservationDialog item={item} open={reservationOpen} onOpenChange={setReservationOpen} />
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {editingNote ? (
              <div className="flex-1 space-y-1.5">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-6 text-xs" onClick={handleSaveNote}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => {
                      setEditingNote(false)
                      setNoteText(item.text_note ?? '')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="text-sm text-left leading-tight hover:underline"
                onClick={() => setEditingNote(true)}
              >
                {item.text_note || <span className="text-muted-foreground italic">Empty note</span>}
              </button>
            )}
          </div>
        </div>
      )}
    </SortableItemCard>
  )
}
