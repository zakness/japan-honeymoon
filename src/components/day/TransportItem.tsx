import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_MODES, type Journey, type TransportMode } from '@/types/transport'
import { useDeleteTransportItem } from '@/hooks/useTransport'
import { getCityColor, getPrimaryCityForDate } from '@/config/trip'
import { getModeStyle } from '@/config/transport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { BookingDots } from '@/components/shared/BookingDots'
import { TransportDialog } from './TransportDialog'
import { SortableItemCard, type CardAction } from './SortableItemCard'

interface TransportItemProps {
  journey: Journey
  dayDate: string
  onSelect?: (journey: Journey) => void
}

export function TransportItem({ journey, dayDate, onSelect }: TransportItemProps) {
  const deleteItem = useDeleteTransportItem()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { parent, legs } = journey
  const display = deriveJourneyDisplay(journey)
  const city = getPrimaryCityForDate(parent.day_date)
  const accentColor = city ? getCityColor(city).primary : undefined

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync({ id: parent.id, dayDate })
    } catch {
      toast.error('Failed to remove transport')
    }
  }

  const actions: CardAction[] = [
    { icon: Pencil, label: 'Edit', onClick: () => setDialogOpen(true) },
    { icon: Trash2, label: 'Delete', onClick: handleDelete, variant: 'destructive' },
  ]

  return (
    <SortableItemCard
      id={parent.id}
      data={{ dayDate, kind: 'transport' as const, timeSlot: parent.time_slot }}
      actions={actions}
      accentColor={accentColor}
      variant={display.isDecided ? 'decided' : 'speculative'}
      onCardClick={onSelect ? () => onSelect(journey) : undefined}
    >
      {/* Row 1 — origin → destination, with booking dots on the right */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block w-full text-left text-sm font-medium leading-tight truncate">
            {display.title}
          </span>
          {(display.earliestDeparture || display.latestArrival) && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {display.earliestDeparture && formatReservationTime(display.earliestDeparture)}
              {display.latestArrival && ` → ${formatReservationTime(display.latestArrival)}`}
            </div>
          )}
        </div>
        <BookingDots legs={legs} className="shrink-0 mt-0.5" />
      </div>

      {/* Row 2 — mode icon strip */}
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
                className="shrink-0"
                color={color}
                aria-label={mode?.label ?? leg.mode}
              />
            )
          })}
        </div>
      )}

      <TransportDialog journey={journey} open={dialogOpen} onOpenChange={setDialogOpen} />
    </SortableItemCard>
  )
}
