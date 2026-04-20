import { useEffect } from 'react'
import { X, Pencil, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_MODES, type Journey, type TransportMode } from '@/types/transport'
import { getModeStyle } from '@/config/transport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { cn } from '@/lib/utils'

interface TransportDetailCardProps {
  journey: Journey
  onClose: () => void
  onEdit: () => void
  variant?: 'floating' | 'sheet'
}

export function TransportDetailCard({
  journey,
  onClose,
  onEdit,
  variant = 'floating',
}: TransportDetailCardProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { parent, legs } = journey
  const display = deriveJourneyDisplay(journey)
  const isFloating = variant === 'floating'

  const chipClass =
    display.totalCount === 0
      ? 'bg-muted text-muted-foreground'
      : display.bookedCount === display.totalCount
        ? 'bg-green-100 text-green-800'
        : display.bookedCount > 0
          ? 'bg-amber-100 text-amber-800'
          : 'bg-muted text-muted-foreground'

  const date = new Date(parent.day_date + 'T00:00:00')
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={
        isFloating
          ? 'absolute top-2 right-2 z-20 w-[320px] max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg border bg-background shadow-xl'
          : 'flex h-full w-full flex-col overflow-y-auto bg-background'
      }
      role="dialog"
      aria-label={`${display.title} details`}
    >
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-1.5 right-1.5 z-20 h-6 w-6 rounded-full hover:bg-muted"
        onClick={onClose}
        aria-label="Close details"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="pr-7 space-y-0.5">
          <div className="text-sm font-semibold leading-tight">
            {display.originName && display.destinationName
              ? `${display.originName} → ${display.destinationName}`
              : display.title}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{dateLabel}</span>
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
          </div>
        </div>

        {/* Leg list */}
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
          <div className="text-xs whitespace-pre-wrap text-muted-foreground">{parent.notes}</div>
        )}

        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}
