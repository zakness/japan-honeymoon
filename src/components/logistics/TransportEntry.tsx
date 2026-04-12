import { formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_TYPES } from '@/types/transport'
import type { TransportItemRow } from '@/types/transport'

interface TransportEntryProps {
  item: TransportItemRow
}

export function TransportEntry({ item }: TransportEntryProps) {
  const transportType = TRANSPORT_TYPES.find((t) => t.value === item.type)

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {transportType && <span className="text-base">{transportType.icon}</span>}
          <div>
            <p className="text-sm font-semibold leading-tight">
              {item.origin} → {item.destination}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatReservationTime(item.departure_time)}
              {item.arrival_time && ` → ${formatReservationTime(item.arrival_time)}`}
            </p>
          </div>
        </div>
        {item.confirmation && (
          <span className="font-mono text-xs text-muted-foreground"># {item.confirmation}</span>
        )}
      </div>

      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
    </div>
  )
}
