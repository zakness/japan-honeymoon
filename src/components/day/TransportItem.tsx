import { useState } from 'react'
import { Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { type TimeSlot, formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_TYPES, type TransportItemRow } from '@/types/transport'
import { useDeleteTransportItem, useUpdateTransportItem } from '@/hooks/useTransport'
import { getCityColor, getPrimaryCityForDate } from '@/config/trip'
import { TransportDialog } from './TransportDialog'
import {
  SortableItemCard,
  TimeSlotMenu,
  TimeSlotMenuItems,
  DeleteItemButton,
} from './SortableItemCard'

interface TransportItemProps {
  item: TransportItemRow
  dayDate: string
}

export function TransportItem({ item, dayDate }: TransportItemProps) {
  const deleteItem = useDeleteTransportItem()
  const updateItem = useUpdateTransportItem()
  const [dialogOpen, setDialogOpen] = useState(false)

  const transportType = TRANSPORT_TYPES.find((t) => t.value === item.type)
  const timeSlot = item.time_slot as TimeSlot
  const city = getPrimaryCityForDate(item.day_date)
  const accentColor = city ? getCityColor(city).primary : undefined

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

  const actions = (
    <>
      <TimeSlotMenu timeSlot={timeSlot}>
        <DropdownMenuItem onClick={() => setDialogOpen(true)}>Edit transport</DropdownMenuItem>
        <DropdownMenuSeparator />
        <TimeSlotMenuItems current={timeSlot} onChange={handleTimeSlotChange} />
      </TimeSlotMenu>
      <DeleteItemButton onDelete={handleDelete} label="Remove transport" />
    </>
  )

  return (
    <SortableItemCard
      id={item.id}
      data={{ dayDate, kind: 'transport' as const, timeSlot: item.time_slot }}
      actions={actions}
      accentColor={accentColor}
    >
      <div className="flex items-center gap-1.5">
        {transportType && (
          <transportType.icon size={14} className="shrink-0 text-muted-foreground" />
        )}
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
      <TransportDialog item={item} open={dialogOpen} onOpenChange={setDialogOpen} />
    </SortableItemCard>
  )
}
