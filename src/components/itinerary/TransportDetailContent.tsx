import { AlertCircle } from 'lucide-react'
import { formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_MODES, type Journey, type TransportMode } from '@/types/transport'
import { getModeStyle } from '@/config/transport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { cn } from '@/lib/utils'

interface TransportDetailContentProps {
  journey: Journey
}

function legBadgeClass(bookingStatus: string) {
  if (bookingStatus === 'booked') return 'bg-green-100 text-green-800'
  if (bookingStatus === 'not_needed') return 'bg-muted text-muted-foreground'
  return 'bg-red-50 text-red-700'
}

function legBadgeLabel(bookingStatus: string) {
  if (bookingStatus === 'booked') return '● Booked'
  if (bookingStatus === 'not_needed') return '– No booking'
  return '○ Not booked'
}

export function TransportDetailContent({ journey }: TransportDetailContentProps) {
  const { parent, legs } = journey
  const display = deriveJourneyDisplay(journey)

  const date = new Date(parent.day_date + 'T00:00:00')
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="p-3 space-y-2">
      <div className="pr-7 space-y-0.5">
        <div className="text-sm font-semibold leading-tight">{display.title}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{dateLabel}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {legs.map((leg) => {
          const mode = TRANSPORT_MODES.find((m) => m.value === (leg.mode as TransportMode))
          const Icon = mode?.icon
          const { color } = getModeStyle(leg.mode)
          const missingCoords =
            leg.origin_lat == null ||
            leg.origin_lng == null ||
            leg.destination_lat == null ||
            leg.destination_lng == null

          return (
            <div key={leg.id} className="rounded-md border bg-card/50 px-2 py-1.5">
              <div className="flex items-start gap-2">
                {Icon && <Icon size={14} color={color} className="mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="text-xs font-medium leading-tight truncate">
                      {leg.origin_name} → {leg.destination_name}
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none',
                        legBadgeClass(leg.booking_status)
                      )}
                    >
                      {legBadgeLabel(leg.booking_status)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {formatReservationTime(leg.departure_time)}
                    {leg.arrival_time && ` → ${formatReservationTime(leg.arrival_time)}`}
                    {leg.booking_status === 'booked' && leg.confirmation && (
                      <>
                        {' · '}
                        <span className="font-mono">{leg.confirmation}</span>
                      </>
                    )}
                  </div>
                  {leg.notes && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground whitespace-pre-wrap">
                      {leg.notes}
                    </div>
                  )}
                  {missingCoords && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertCircle size={11} />
                      <span>Missing coordinates</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {parent.notes && (
        <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{parent.notes}</div>
      )}
    </div>
  )
}
