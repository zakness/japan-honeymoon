import { formatReservationTime } from '@/types/itinerary'
import type { FlightEvent } from '@/lib/logistics-utils'

interface FlightEventCardProps {
  event: FlightEvent
}

export function FlightEventCard({ event }: FlightEventCardProps) {
  const { kind, flight, localTime } = event
  const isDeparture = kind === 'departure'
  const airport = isDeparture ? flight.dep_airport : flight.arr_airport
  const otherAirport = isDeparture ? flight.arr_airport : flight.dep_airport

  return (
    <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{isDeparture ? '✈️' : '🛬'}</span>
        <div>
          <p className="text-sm font-semibold leading-tight">
            {isDeparture ? 'Depart' : 'Arrive'} {airport}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatReservationTime(localTime)} ·{' '}
            {isDeparture ? `→ ${otherAirport}` : `← ${otherAirport}`} · {flight.flight_number}
          </p>
        </div>
      </div>
      {isDeparture && (
        <span className="font-mono text-xs text-muted-foreground">{flight.confirmation}</span>
      )}
    </div>
  )
}
