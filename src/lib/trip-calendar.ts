import { TRIP_DAYS, getPrimaryCityForDate, type City, type TripDay } from '@/config/trip'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Local-time YYYY-MM-DD formatter (no UTC drift across timezones). */
function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface CalendarCell {
  /** YYYY-MM-DD. */
  date: string
  /** TripDay row if this date is part of the trip; null for padding cells. */
  tripDay: TripDay | null
  isEmpty: boolean
  isTransit: boolean
  /** Destination city for transit days; the only city for single-city days. Null for padding. */
  primaryCity: City | null
  /** Origin city when isTransit and cities.length > 1. Null otherwise. Drives the left-half split-fill. */
  originCity: City | null
  /** City this cell belongs to in band rendering (equals primaryCity for trip cells). */
  bandCity: City | null
  /** First cell of its band within the week. */
  isBandStart: boolean
  /** Last cell of its band within the week. */
  isBandEnd: boolean
  /**
   * Whether the band background should render with `rounded-l` on this cell.
   * False for transit cells with an origin overlay (the overlay covers the
   * band's left half, so its left edge is hidden either way).
   */
  bandRoundLeft: boolean
  /**
   * Whether the band background should render with `rounded-r` on this cell.
   * False when the next cell is a transit whose origin city matches this
   * cell's band — the two would face each other with curves, leaving an
   * unwanted lens-shaped gap. Flat edges connect cleanly instead.
   */
  bandRoundRight: boolean
  /**
   * Whether the transit-origin overlay should render with `rounded-l`. False
   * when the previous cell's band is the same city — they connect flat.
   */
  originRoundLeft: boolean
}

export interface CalendarWeek {
  /** Sunday's YYYY-MM-DD that begins this week. */
  startDate: string
  cells: CalendarCell[]
}

/**
 * Build a Sunday-padded week grid that covers every TRIP_DAY. Padding cells
 * (before trip start or after trip end) carry tripDay=null + isEmpty=true.
 *
 * Each week is computed independently for band membership — a city run that
 * crosses a Sunday boundary will yield two bands (one per week). This matches
 * the visual model: bands break at week wraps.
 */
export function buildCalendarWeeks(): CalendarWeek[] {
  if (TRIP_DAYS.length === 0) return []

  const firstTripDate = new Date(TRIP_DAYS[0].date + 'T00:00:00')
  const lastTripDate = new Date(TRIP_DAYS[TRIP_DAYS.length - 1].date + 'T00:00:00')

  const calendarStart = new Date(firstTripDate)
  calendarStart.setDate(firstTripDate.getDate() - firstTripDate.getDay())

  const calendarEnd = new Date(lastTripDate)
  calendarEnd.setDate(lastTripDate.getDate() + (6 - lastTripDate.getDay()))

  const totalDays = Math.round((calendarEnd.getTime() - calendarStart.getTime()) / MS_PER_DAY) + 1
  const numWeeks = totalDays / 7

  const tripByDate = new Map<string, TripDay>(TRIP_DAYS.map((d) => [d.date, d]))

  const weeks: CalendarWeek[] = []
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(calendarStart)
    weekStart.setDate(calendarStart.getDate() + w * 7)
    const cells: CalendarCell[] = []
    for (let c = 0; c < 7; c++) {
      const cellDate = new Date(weekStart)
      cellDate.setDate(weekStart.getDate() + c)
      const iso = toIsoDate(cellDate)
      const tripDay = tripByDate.get(iso) ?? null
      const isEmpty = tripDay === null
      const isTransit = tripDay?.isTransit ?? false
      const primaryCity = tripDay ? (getPrimaryCityForDate(iso) ?? null) : null
      // Origin city only on transit days with > 1 city listed. Day 15 (Osaka →
      // NYC) lists a single city — no origin overlay, no split-fill.
      const originCity =
        tripDay && tripDay.isTransit && tripDay.cities.length > 1 ? tripDay.cities[0] : null
      cells.push({
        date: iso,
        tripDay,
        isEmpty,
        isTransit,
        primaryCity,
        originCity,
        bandCity: primaryCity,
        isBandStart: false,
        isBandEnd: false,
        bandRoundLeft: false,
        bandRoundRight: false,
        originRoundLeft: false,
      })
    }
    // Compute band edges and visual rounding flags by walking the week.
    for (let c = 0; c < 7; c++) {
      const cell = cells[c]
      const prev = c > 0 ? cells[c - 1] : null
      const next = c < 6 ? cells[c + 1] : null
      if (cell.bandCity) {
        if (!prev || prev.bandCity !== cell.bandCity) cell.isBandStart = true
        if (!next || next.bandCity !== cell.bandCity) cell.isBandEnd = true
        // The band's left edge is hidden behind the origin overlay when the
        // cell is a transit-with-origin — no point rendering rounding there.
        cell.bandRoundLeft = cell.isBandStart && !(cell.isTransit && Boolean(cell.originCity))
        // The band's right edge would collide with the next cell's origin
        // overlay (same city, abutting via vertical mid-cell line) — flatten.
        cell.bandRoundRight =
          cell.isBandEnd && !(next?.isTransit && next.originCity === cell.bandCity)
      }
      // Origin overlay on transit cells: round its left only when it doesn't
      // merge with the previous cell's same-city band.
      if (cell.originCity) {
        cell.originRoundLeft = prev?.bandCity !== cell.originCity
      }
    }
    weeks.push({ startDate: toIsoDate(weekStart), cells })
  }

  return weeks
}

/** Trip-axis neighbors using TRIP_DAYS ordering (crosses city boundaries). */
export function getAdjacentTripDates(date: string): { prev: string | null; next: string | null } {
  const idx = TRIP_DAYS.findIndex((d) => d.date === date)
  if (idx < 0) return { prev: null, next: null }
  return {
    prev: idx > 0 ? TRIP_DAYS[idx - 1].date : null,
    next: idx < TRIP_DAYS.length - 1 ? TRIP_DAYS[idx + 1].date : null,
  }
}

/** Pick a sensible starting day: today if in trip range, else day 1. */
export function pickInitialTripDate(today: string): string {
  return TRIP_DAYS.some((d) => d.date === today) ? today : TRIP_DAYS[0].date
}
