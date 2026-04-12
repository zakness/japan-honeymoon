import type { FlightRow } from '@/types/flights'
import type { AccommodationRow } from '@/types/accommodations'
import type { TransportItemRow } from '@/types/transport'

// ---- Airport → IANA timezone map ----

export const AIRPORT_TIMEZONES: Record<string, string> = {
  JFK: 'America/New_York',
  LGA: 'America/New_York',
  EWR: 'America/New_York',
  NRT: 'Asia/Tokyo',
  HND: 'Asia/Tokyo',
  KIX: 'Asia/Tokyo',
  ITM: 'Asia/Tokyo',
}

// ---- Discriminated union ----

export type LogisticsEntry =
  | { kind: 'flight'; date: string; sortTime: string | null; data: FlightRow }
  | { kind: 'hotel_checkin'; date: string; sortTime: string | null; data: AccommodationRow }
  | { kind: 'hotel_checkout'; date: string; sortTime: string | null; data: AccommodationRow }
  | { kind: 'transport'; date: string; sortTime: string | null; data: TransportItemRow }

// ---- Internal helpers ----

const NULL_TIME_SENTINEL = '99:99'

function compareEntries(a: LogisticsEntry, b: LogisticsEntry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  const ta = a.sortTime ?? NULL_TIME_SENTINEL
  const tb = b.sortTime ?? NULL_TIME_SENTINEL
  return ta < tb ? -1 : ta > tb ? 1 : 0
}

// Extract YYYY-MM-DD in the departure airport's local timezone
export function localDateForAirport(ts: string, airport: string): string {
  const tz = AIRPORT_TIMEZONES[airport] ?? 'UTC'
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: tz })
}

// Extract HH:MM (24h) in the departure airport's local timezone — used for sort key
export function localTimeHHMMForAirport(ts: string, airport: string): string {
  const tz = AIRPORT_TIMEZONES[airport] ?? 'UTC'
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Normalize TIME column ("HH:MM:SS" or "HH:MM") to "HH:MM" for sort comparison
export function normalizeTimeColumn(t: string | null): string | null {
  if (!t) return null
  return t.slice(0, 5)
}

// ---- Flight events for day view ----

export type FlightEvent = {
  id: string
  kind: 'departure' | 'arrival'
  flight: FlightRow
  localTime: string // HH:MM — used for slot derivation and display
}

export function getFlightEventsForDate(flights: FlightRow[], date: string): FlightEvent[] {
  const events: FlightEvent[] = []
  for (const f of flights) {
    if (localDateForAirport(f.departure_at, f.dep_airport) === date) {
      events.push({
        id: `${f.id}-dep`,
        kind: 'departure',
        flight: f,
        localTime: localTimeHHMMForAirport(f.departure_at, f.dep_airport),
      })
    }
    if (localDateForAirport(f.arrival_at, f.arr_airport) === date) {
      events.push({
        id: `${f.id}-arr`,
        kind: 'arrival',
        flight: f,
        localTime: localTimeHHMMForAirport(f.arrival_at, f.arr_airport),
      })
    }
  }
  return events
}

// ---- Main exports ----

export function buildLogisticsTimeline(
  flights: FlightRow[],
  accommodations: AccommodationRow[],
  transportItems: TransportItemRow[]
): LogisticsEntry[] {
  const entries: LogisticsEntry[] = []

  for (const f of flights) {
    entries.push({
      kind: 'flight',
      date: localDateForAirport(f.departure_at, f.dep_airport),
      sortTime: localTimeHHMMForAirport(f.departure_at, f.dep_airport),
      data: f,
    })
  }

  for (const a of accommodations) {
    entries.push({
      kind: 'hotel_checkin',
      date: a.check_in_date,
      sortTime: normalizeTimeColumn(a.check_in_time),
      data: a,
    })
    entries.push({
      kind: 'hotel_checkout',
      date: a.check_out_date,
      sortTime: normalizeTimeColumn(a.check_out_time),
      data: a,
    })
  }

  for (const t of transportItems) {
    entries.push({
      kind: 'transport',
      date: t.day_date,
      sortTime: normalizeTimeColumn(t.departure_time),
      data: t,
    })
  }

  return entries.sort(compareEntries)
}

export function groupEntriesByDate(
  entries: LogisticsEntry[]
): { date: string; entries: LogisticsEntry[] }[] {
  const map = new Map<string, LogisticsEntry[]>()
  for (const e of entries) {
    if (!map.has(e.date)) map.set(e.date, [])
    map.get(e.date)!.push(e)
  }
  return Array.from(map.entries()).map(([date, es]) => ({ date, entries: es }))
}
