import { Pencil } from 'lucide-react'
import { formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_MODES, type Journey, type TransportMode } from '@/types/transport'
import { getModeStyle } from '@/config/transport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { cn } from '@/lib/utils'

interface TransportEntryProps {
  journey: Journey
  onEdit?: (journey: Journey) => void
}

export function TransportEntry({ journey, onEdit }: TransportEntryProps) {
  const display = deriveJourneyDisplay(journey)
  const { legs, parent } = journey

  const allBooked = display.totalCount > 0 && display.bookedCount === display.totalCount
  const noneBooked = display.totalCount > 0 && display.bookedCount === 0
  const chipClass = allBooked
    ? 'bg-green-100 text-green-800'
    : noneBooked
      ? 'bg-red-50 text-red-700'
      : 'bg-amber-100 text-amber-800'

  const title =
    display.originName && display.destinationName
      ? `${display.originName} → ${display.destinationName}`
      : display.title

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{title}</p>
          {(display.earliestDeparture || display.latestArrival) && (
            <p className="text-xs text-muted-foreground">
              {display.earliestDeparture && formatReservationTime(display.earliestDeparture)}
              {display.latestArrival && ` → ${formatReservationTime(display.latestArrival)}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {display.totalCount > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
                chipClass
              )}
            >
              {display.bookedCount}/{display.totalCount} booked
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(journey)}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Edit journey"
              title="Edit journey"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-1">
        {legs.map((leg) => {
          const modeMeta = TRANSPORT_MODES.find((m) => m.value === (leg.mode as TransportMode))
          const Icon = modeMeta?.icon
          const { color } = getModeStyle(leg.mode)
          return (
            <li key={leg.id} className="px-1.5 py-1">
              <div className="flex items-start gap-1.5">
                {Icon && <Icon size={13} color={color} className="mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-xs font-medium leading-tight truncate">
                      {leg.origin_name} → {leg.destination_name}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none',
                        leg.is_booked ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'
                      )}
                    >
                      {leg.is_booked ? 'Booked' : 'Not booked'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {formatReservationTime(leg.departure_time)}
                    {leg.arrival_time && ` → ${formatReservationTime(leg.arrival_time)}`}
                    {leg.is_booked && leg.confirmation && (
                      <>
                        {' · '}
                        <span className="font-mono">{leg.confirmation}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {parent.notes && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{parent.notes}</p>
      )}
    </div>
  )
}
