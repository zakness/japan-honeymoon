import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MapPin, Trash2, StickyNote, ChevronDown, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PLACE_CATEGORIES } from '@/types/places'
import {
  TIME_SLOTS,
  type TimeSlot,
  type ItineraryItemWithPlace,
  formatReservationTime,
} from '@/types/itinerary'
import { useDeleteItineraryItem, useUpdateItineraryItem } from '@/hooks/useItinerary'
import { ReservationDialog } from './ReservationDialog'

interface ItineraryItemProps {
  item: ItineraryItemWithPlace
  dayDate: string
  onSelectPlace?: (placeId: string) => void
}

export function ItineraryItem({ item, dayDate, onSelectPlace }: ItineraryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { dayDate, kind: 'itinerary' as const, timeSlot: item.time_slot },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
  }

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border bg-card p-2.5 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
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
                  {item.text_note || (
                    <span className="text-muted-foreground italic">Empty note</span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Time slot / reservation menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground gap-0.5"
              type="button"
            >
              {timeSlot}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
                {TIME_SLOTS.map((slot) => (
                  <DropdownMenuItem
                    key={slot.value}
                    onClick={() => handleTimeSlotChange(slot.value)}
                    className={timeSlot === slot.value ? 'font-medium' : ''}
                  >
                    {slot.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isPlace && (
        <ReservationDialog item={item} open={reservationOpen} onOpenChange={setReservationOpen} />
      )}
    </div>
  )
}
