import { useState } from 'react'
import { toast } from 'sonner'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { type TimeSlot, formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_MODES, type Journey, type TransportMode } from '@/types/transport'
import { useDeleteTransportItem, useUpdateJourney } from '@/hooks/useTransport'
import { getCityColor, getPrimaryCityForDate } from '@/config/trip'
import { getModeStyle } from '@/config/transport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { cn } from '@/lib/utils'
import { TransportDialog } from './TransportDialog'
import {
  SortableItemCard,
  TimeSlotMenu,
  TimeSlotMenuItems,
  DeleteItemButton,
} from './SortableItemCard'

interface TransportItemProps {
  journey: Journey
  dayDate: string
  onSelect?: (journey: Journey) => void
}

export function TransportItem({ journey, dayDate, onSelect }: TransportItemProps) {
  const deleteItem = useDeleteTransportItem()
  const updateJourney = useUpdateJourney()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { parent, legs } = journey
  const display = deriveJourneyDisplay(journey)
  const timeSlot = parent.time_slot as TimeSlot
  const city = getPrimaryCityForDate(parent.day_date)
  const accentColor = city ? getCityColor(city).primary : undefined

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync({ id: parent.id, dayDate })
    } catch {
      toast.error('Failed to remove transport')
    }
  }

  async function handleTimeSlotChange(slot: TimeSlot) {
    try {
      await updateJourney.mutateAsync({
        id: parent.id,
        parentPatch: { time_slot: slot },
        legs: [],
      })
    } catch {
      toast.error('Failed to update time slot')
    }
  }

  // Aggregate booking status → chip color.
  // full booked → green, partial → amber, none → neutral.
  const chipClass =
    display.totalCount === 0
      ? 'bg-muted text-muted-foreground'
      : display.bookedCount === display.totalCount
        ? 'bg-green-100 text-green-800'
        : display.bookedCount > 0
          ? 'bg-amber-100 text-amber-800'
          : 'bg-muted text-muted-foreground'

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
      id={parent.id}
      data={{ dayDate, kind: 'transport' as const, timeSlot: parent.time_slot }}
      actions={actions}
      accentColor={accentColor}
    >
      {/* Row 1 — origin → destination, with time range on the right */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block w-full text-left text-sm font-medium leading-tight truncate hover:underline"
            onClick={() => onSelect?.(journey)}
          >
            {display.originName && display.destinationName
              ? `${display.originName} → ${display.destinationName}`
              : display.title}
          </button>
          {(display.earliestDeparture || display.latestArrival) && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {display.earliestDeparture && formatReservationTime(display.earliestDeparture)}
              {display.latestArrival && ` → ${formatReservationTime(display.latestArrival)}`}
            </div>
          )}
        </div>
        {display.totalCount > 0 && (
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
              chipClass
            )}
            title={
              display.bookedCount === display.totalCount
                ? 'All legs booked'
                : display.bookedCount === 0
                  ? 'No legs booked'
                  : `${display.bookedCount} of ${display.totalCount} booked`
            }
          >
            {display.bookedCount}/{display.totalCount}
          </span>
        )}
      </div>

      {/* Row 2 — mode icon strip. Dimmed if the leg isn't booked. */}
      {legs.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          {legs.map((leg) => {
            const mode = TRANSPORT_MODES.find((m) => m.value === (leg.mode as TransportMode))
            const { color } = getModeStyle(leg.mode)
            const Icon = mode?.icon
            if (!Icon) return null
            return (
              <Icon
                key={leg.id}
                size={14}
                className={cn('shrink-0', !leg.is_booked && 'opacity-40')}
                color={color}
                aria-label={`${mode?.label ?? leg.mode}${leg.is_booked ? ' (booked)' : ' (not booked)'}`}
              />
            )
          })}
        </div>
      )}

      <TransportDialog journey={journey} open={dialogOpen} onOpenChange={setDialogOpen} />
    </SortableItemCard>
  )
}
