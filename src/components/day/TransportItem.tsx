import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronDown, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TIME_SLOTS, type TimeSlot, formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_TYPES, type TransportItemRow } from '@/types/transport'
import { useDeleteTransportItem, useUpdateTransportItem } from '@/hooks/useTransport'
import { TransportDialog } from './TransportDialog'

interface TransportItemProps {
  item: TransportItemRow
  dayDate: string
}

export function TransportItem({ item, dayDate }: TransportItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { dayDate, kind: 'transport' as const, timeSlot: item.time_slot },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
  }

  const deleteItem = useDeleteTransportItem()
  const updateItem = useUpdateTransportItem()
  const [dialogOpen, setDialogOpen] = useState(false)

  const transportType = TRANSPORT_TYPES.find((t) => t.value === item.type)
  const timeSlot = item.time_slot as TimeSlot

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync({ id: item.id, dayDate })
    } catch {
      toast.error('Failed to remove transport')
    }
  }

  async function handleTimeSlotChange(slot: TimeSlot) {
    try {
      await updateItem.mutateAsync({ id: item.id, time_slot: slot })
    } catch {
      toast.error('Failed to update time slot')
    }
  }

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
        <div className="flex items-center gap-1.5">
          {transportType && <span className="text-sm">{transportType.icon}</span>}
          <span className="text-sm font-medium">
            {item.origin} → {item.destination}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatReservationTime(item.departure_time)}
          {item.arrival_time && ` → ${formatReservationTime(item.arrival_time)}`}
        </div>
        {item.confirmation && (
          <button
            className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            onClick={() => setDialogOpen(true)}
            title="Edit transport"
          >
            <Ticket className="h-3 w-3" />
            {item.confirmation}
          </button>
        )}
        {item.notes && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>Edit transport</DropdownMenuItem>
            {TIME_SLOTS.map((slot) => (
              <DropdownMenuItem
                key={slot.value}
                onClick={() => handleTimeSlotChange(slot.value)}
                className={timeSlot === slot.value ? 'font-medium' : ''}
              >
                {slot.label}
              </DropdownMenuItem>
            ))}
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

      <TransportDialog item={item} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
