import { PlaneTakeoff } from 'lucide-react'
import { AIRPORT_TIMEZONES } from '@/lib/logistics-utils'
import type { FlightRow } from '@/types/flights'

function formatFlightTime(ts: string, airport: string): string {
  const tz = AIRPORT_TIMEZONES[airport] ?? 'UTC'
  return new Date(ts).toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatFlightDate(ts: string, airport: string): string {
  const tz = AIRPORT_TIMEZONES[airport] ?? 'UTC'
  return new Date(ts).toLocaleDateString('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
  })
}

interface FlightEntryProps {
  flight: FlightRow
}

export function FlightEntry({ flight }: FlightEntryProps) {
  const depTime = formatFlightTime(flight.departure_at, flight.dep_airport)
  const arrTime = formatFlightTime(flight.arrival_at, flight.arr_airport)
  const depDate = formatFlightDate(flight.departure_at, flight.dep_airport)
  const arrDate = formatFlightDate(flight.arrival_at, flight.arr_airport)
  const crossDay = depDate !== arrDate

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PlaneTakeoff size={16} />
          <span className="text-sm font-semibold">
            {flight.airline} {flight.flight_number}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{flight.confirmation}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="text-center">
          <p className="font-semibold">{flight.dep_airport}</p>
          <p className="text-xs text-muted-foreground">{depTime}</p>
        </div>
        <div className="flex-1 flex items-center gap-1 text-muted-foreground">
          <div className="flex-1 border-t border-dashed" />
          <span className="text-xs">→</span>
          <div className="flex-1 border-t border-dashed" />
        </div>
        <div className="text-center">
          <p className="font-semibold">{flight.arr_airport}</p>
          <p className="text-xs text-muted-foreground">
            {arrTime}
            {crossDay && <span className="ml-1 text-muted-foreground/60">({arrDate})</span>}
          </p>
        </div>
      </div>

      {flight.notes && <p className="text-xs text-muted-foreground">{flight.notes}</p>}
    </div>
  )
}
