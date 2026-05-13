/**
 * Markdown exporter for AI-agent itinerary planning.
 *
 * Pulls the current trip state from Supabase and writes per-city markdown
 * files to `exports/`. The output is gitignored and regenerated on every run
 * (`npm run export-context`). The companion `.claude/skills/itinerary-context`
 * skill invokes this script and feeds the resulting files into planning
 * conversations.
 *
 * Read-only by design — never writes to Supabase.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CITY_LABELS,
  TRIP_DAYS,
  formatTripDate,
  getDayByDate,
  getDaysForCity,
  type City,
  type TripDay,
} from '@/config/trip'
import { TRANSPORT_MODES, type Journey, type TransportLegRow } from '@/types/transport'
import { TIME_SLOTS, type ItineraryItemWithPlace, type TimeSlot } from '@/types/itinerary'
import type { Database } from '@/types/database'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { NoteRow } from '@/types/notes'
import { deriveJourneyDisplay } from '@/lib/transport-utils'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const OUT_DIR = resolve(REPO_ROOT, 'exports')

function buildSupabaseClient() {
  dotenv.config({ path: resolve(REPO_ROOT, '.env.local') })
  dotenv.config({ path: resolve(REPO_ROOT, '.env') })

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check .env.local')
    process.exit(1)
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

const CITIES: City[] = ['tokyo', 'hakone', 'kyoto', 'naoshima', 'osaka']

const TIME_SLOT_ORDER: Record<TimeSlot, number> = TIME_SLOTS.reduce(
  (acc, slot, i) => {
    acc[slot.value] = i
    return acc
  },
  {} as Record<TimeSlot, number>
)

const TIME_SLOT_LABELS: Record<TimeSlot, string> = TIME_SLOTS.reduce(
  (acc, slot) => {
    acc[slot.value] = slot.label
    return acc
  },
  {} as Record<TimeSlot, string>
)

const MODE_LABELS: Record<string, string> = TRANSPORT_MODES.reduce(
  (acc, m) => {
    acc[m.value] = m.label
    return acc
  },
  {} as Record<string, string>
)

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe_bar: 'Cafe / Bar',
  shopping: 'Shopping',
  attraction: 'Attraction',
  nature_park: 'Nature / Park',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TripBundle {
  places: PlaceRow[]
  accommodations: AccommodationRow[]
  itineraryItems: ItineraryItemWithPlace[]
  journeys: Journey[]
  notes: NoteRow[]
  // Derived
  placesById: Map<string, PlaceRow>
  childrenByParent: Map<string, PlaceRow[]>
  itemsByDay: Map<string, ItineraryItemWithPlace[]>
  journeysByDay: Map<string, Journey[]>
  /** placeId → list of YYYY-MM-DD dates the place (or its parent) is scheduled on */
  scheduledDatesByPlace: Map<string, string[]>
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchTripData(
  supabase: ReturnType<typeof buildSupabaseClient>
): Promise<TripBundle> {
  const [placesRes, accommodationsRes, itemsRes, transportRes, legsRes, notesRes] =
    await Promise.all([
      supabase.from('places').select('*'),
      supabase.from('accommodations').select('*').order('check_in_date', { ascending: true }),
      supabase.from('itinerary_items').select('*, place:places(*)'),
      supabase.from('transport_items').select('*'),
      supabase.from('transport_legs').select('*'),
      supabase.from('notes').select('*').order('sort_order', { ascending: true }),
    ])

  for (const [name, res] of [
    ['places', placesRes],
    ['accommodations', accommodationsRes],
    ['itinerary_items', itemsRes],
    ['transport_items', transportRes],
    ['transport_legs', legsRes],
    ['notes', notesRes],
  ] as const) {
    if (res.error) {
      console.error(`Failed to fetch ${name}:`, res.error.message)
      process.exit(1)
    }
  }

  const places = (placesRes.data ?? []) as PlaceRow[]
  const accommodations = (accommodationsRes.data ?? []) as AccommodationRow[]
  const itineraryItems = (itemsRes.data ?? []) as ItineraryItemWithPlace[]
  const transportItems = transportRes.data ?? []
  const legs = (legsRes.data ?? []) as TransportLegRow[]
  const notes = (notesRes.data ?? []) as NoteRow[]

  // Build journeys (mirrors useAllJourneys)
  const legsByParent = new Map<string, TransportLegRow[]>()
  for (const leg of legs) {
    const arr = legsByParent.get(leg.transport_id) ?? []
    arr.push(leg)
    legsByParent.set(leg.transport_id, arr)
  }
  for (const arr of legsByParent.values()) {
    arr.sort((a, b) => a.leg_index - b.leg_index)
  }
  const journeys: Journey[] = transportItems.map((parent) => ({
    parent,
    legs: legsByParent.get(parent.id) ?? [],
  }))

  // Derived lookups
  const placesById = new Map<string, PlaceRow>()
  for (const p of places) placesById.set(p.id, p)

  const childrenByParent = new Map<string, PlaceRow[]>()
  for (const p of places) {
    if (p.parent_place_id) {
      const arr = childrenByParent.get(p.parent_place_id) ?? []
      arr.push(p)
      childrenByParent.set(p.parent_place_id, arr)
    }
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => (a.child_sort_order ?? 0) - (b.child_sort_order ?? 0))
  }

  const itemsByDay = new Map<string, ItineraryItemWithPlace[]>()
  for (const item of itineraryItems) {
    const arr = itemsByDay.get(item.day_date) ?? []
    arr.push(item)
    itemsByDay.set(item.day_date, arr)
  }

  const journeysByDay = new Map<string, Journey[]>()
  for (const j of journeys) {
    const arr = journeysByDay.get(j.parent.day_date) ?? []
    arr.push(j)
    journeysByDay.set(j.parent.day_date, arr)
  }

  // Scheduled dates: a parent counts as scheduled if it has an itinerary item;
  // its children inherit those dates (mirrors useScheduledDatesByPlace).
  const scheduledDatesByPlace = new Map<string, string[]>()
  for (const item of itineraryItems) {
    if (!item.place_id) continue
    const arr = scheduledDatesByPlace.get(item.place_id) ?? []
    if (!arr.includes(item.day_date)) arr.push(item.day_date)
    scheduledDatesByPlace.set(item.place_id, arr)
  }
  // Roll up to children
  for (const child of places) {
    if (!child.parent_place_id) continue
    const parentDates = scheduledDatesByPlace.get(child.parent_place_id)
    if (parentDates && parentDates.length > 0) {
      const childArr = scheduledDatesByPlace.get(child.id) ?? []
      for (const d of parentDates) {
        if (!childArr.includes(d)) childArr.push(d)
      }
      scheduledDatesByPlace.set(child.id, childArr)
    }
  }
  for (const arr of scheduledDatesByPlace.values()) arr.sort()

  return {
    places,
    accommodations,
    itineraryItems,
    journeys,
    notes,
    placesById,
    childrenByParent,
    itemsByDay,
    journeysByDay,
    scheduledDatesByPlace,
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Render helpers (pure)
// ---------------------------------------------------------------------------

function formatTime12(time: string | null): string | null {
  if (!time) return null
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

function priceLevelString(level: number | null): string | null {
  if (level == null) return null
  if (level === 0) return 'free'
  if (level < 0 || level > 4) return null
  return '¥'.repeat(level)
}

const WEEKDAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const WEEKDAY_SHORT = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
} as const

/**
 * Render JSONB hours into a compact one-line summary.
 * Accepts a few common shapes (Google-style weekday_text array or a
 * map of day→ranges). Best-effort — falls back to JSON for unknown shapes.
 */
export function renderHours(hours: unknown): string | null {
  if (!hours) return null

  // Google Places "weekday_text" shape: array of strings like
  // ["Monday: 9:00 AM – 5:00 PM", ...]
  if (
    typeof hours === 'object' &&
    hours !== null &&
    'weekday_text' in hours &&
    Array.isArray((hours as { weekday_text: unknown }).weekday_text)
  ) {
    const arr = (hours as { weekday_text: string[] }).weekday_text
    return compactWeekdayText(arr)
  }

  if (Array.isArray(hours) && hours.every((x) => typeof x === 'string')) {
    return compactWeekdayText(hours as string[])
  }

  // Generic { monday: '9-17', tuesday: 'closed', ... }
  if (typeof hours === 'object' && hours !== null) {
    const obj = hours as Record<string, unknown>
    const segments: string[] = []
    for (const day of WEEKDAY_NAMES) {
      const val = obj[day]
      if (typeof val !== 'string') continue
      segments.push(`${WEEKDAY_SHORT[day]} ${val}`)
    }
    if (segments.length > 0) return segments.join(', ')
  }

  return null
}

function compactWeekdayText(lines: string[]): string {
  // Convert "Monday: 9:00 AM – 5:00 PM" → "Mon 9–17" style.
  // Keep it simple: just normalize the day prefix and pass times through,
  // stripping seconds/extra whitespace.
  const cleaned = lines
    .map((line) => {
      const m = line.match(/^(\w+):\s*(.+)$/)
      if (!m) return line.trim()
      const day = m[1].toLowerCase() as keyof typeof WEEKDAY_SHORT
      const short = WEEKDAY_SHORT[day] ?? m[1].slice(0, 3)
      return `${short} ${m[2].trim()}`
    })
    .map((s) => s.replace(/\s+/g, ' '))
  return cleaned.join('; ')
}

function placeMustGo(p: PlaceRow): boolean {
  return p.priority === 'must_go'
}

function placeArchived(p: PlaceRow): boolean {
  return p.priority === 'archived'
}

function placeMetadataLine(p: PlaceRow): string {
  const parts: string[] = []
  const cat = CATEGORY_LABELS[p.category] ?? p.category
  parts.push(cat)
  const price = priceLevelString(p.price_level)
  if (price) parts.push(price)
  const tags = (p.tags ?? []).filter(Boolean)
  if (tags.length > 0) parts.push(`tagged: ${tags.join(', ')}`)
  if (p.status && p.status !== 'researching') parts.push(`status: ${p.status}`)
  return `*${parts.join(' · ')}*`
}

function scheduledLineFor(place: PlaceRow, bundle: TripBundle): string | null {
  const dates = bundle.scheduledDatesByPlace.get(place.id) ?? []
  if (dates.length === 0) return null

  // Find each itinerary item for context (day, slot, time).
  // For children, use the parent's items (children inherit).
  const sourceId = place.parent_place_id ?? place.id
  const items = bundle.itineraryItems.filter((i) => i.place_id === sourceId)
  if (items.length === 0) return `Scheduled on ${dates.join(', ')}`

  const entries = items
    .slice()
    .sort((a, b) => a.day_date.localeCompare(b.day_date))
    .map((item) => {
      const day = getDayByDate(item.day_date)
      const dayLabel = day
        ? `day ${day.dayNumber} (${formatTripDate(item.day_date)})`
        : item.day_date
      const slotLabel = TIME_SLOT_LABELS[item.time_slot as TimeSlot] ?? item.time_slot
      const time = formatTime12(item.reservation_time)
      const timePart = time ? ` at ${time}` : ''
      const decided = item.is_decided ? '' : ' (speculative)'
      return `${dayLabel} · ${slotLabel}${timePart}${decided}`
    })
  return `Scheduled: ${entries.join('; ')}`
}

export function renderPlace(
  place: PlaceRow,
  bundle: TripBundle,
  opts: { includeSchedule?: boolean } = {}
): string {
  const lines: string[] = []
  const star = placeMustGo(place) ? ' ⭐' : ''
  lines.push(`### ${place.name}${star}`)
  lines.push('')
  lines.push(placeMetadataLine(place))

  // Parent breadcrumb
  if (place.parent_place_id) {
    const parent = bundle.placesById.get(place.parent_place_id)
    if (parent) lines.push(`Part of: **${parent.name}**`)
  }

  if (place.address) lines.push(place.address)

  const ratingParts: string[] = []
  if (place.rating != null) ratingParts.push(`Rating: ${place.rating.toFixed(1)}`)
  const hoursStr = renderHours(place.hours)
  if (hoursStr) ratingParts.push(`Hours: ${hoursStr}`)
  if (ratingParts.length > 0) lines.push(ratingParts.join(' · '))

  if (place.phone) lines.push(`Phone: ${place.phone}`)
  if (place.website) lines.push(`Website: ${place.website}`)

  if (opts.includeSchedule !== false) {
    const sched = scheduledLineFor(place, bundle)
    if (sched) lines.push(sched)
  }

  if (place.notes && place.notes.trim()) {
    lines.push('')
    lines.push('Notes:')
    lines.push(place.notes.trim())
  }

  const children = bundle.childrenByParent.get(place.id) ?? []
  if (children.length > 0) {
    lines.push('')
    lines.push(`**Children (${children.length}):**`)
    for (const c of children) {
      const cStar = placeMustGo(c) ? ' ⭐' : ''
      const cNote = c.notes && c.notes.trim() ? ` — ${truncate(c.notes.trim(), 120)}` : ''
      lines.push(`- ${c.name}${cStar}${cNote}`)
    }
  }

  return lines.join('\n')
}

export function renderPlaceArchived(place: PlaceRow): string {
  const cat = CATEGORY_LABELS[place.category] ?? place.category
  const reason = place.notes && place.notes.trim() ? ` — ${truncate(place.notes.trim(), 200)}` : ''
  return `- **${place.name}** *(${cat})*${reason}`
}

export function renderHotel(hotel: AccommodationRow): string {
  const lines: string[] = []
  lines.push(`### ${hotel.name}`)
  lines.push('')

  const dateLine = `${formatTripDate(hotel.check_in_date)} → ${formatTripDate(hotel.check_out_date)}`
  const nights = nightCount(hotel.check_in_date, hotel.check_out_date)
  lines.push(`*${dateLine} (${nights} night${nights === 1 ? '' : 's'})*`)

  if (hotel.address) lines.push(hotel.address)

  const times: string[] = []
  const ci = formatTime12(hotel.check_in_time)
  const co = formatTime12(hotel.check_out_time)
  if (ci) times.push(`check-in ${ci}`)
  if (co) times.push(`check-out ${co}`)
  if (times.length > 0) lines.push(times.join(' · '))

  if (hotel.rating != null) lines.push(`Rating: ${hotel.rating.toFixed(1)}`)
  if (hotel.tags && hotel.tags.length > 0) lines.push(`Tags: ${hotel.tags.join(', ')}`)
  if (hotel.phone) lines.push(`Phone: ${hotel.phone}`)
  if (hotel.website) lines.push(`Website: ${hotel.website}`)
  if (hotel.booking_url) lines.push(`Booking: ${hotel.booking_url}`)
  if (hotel.booked_by) lines.push(`Booked by: ${hotel.booked_by}`)
  if (hotel.confirmation_numbers && hotel.confirmation_numbers.length > 0) {
    lines.push(`Confirmations: ${hotel.confirmation_numbers.join(', ')}`)
  }

  if (hotel.notes && hotel.notes.trim()) {
    lines.push('')
    lines.push('Notes:')
    lines.push(hotel.notes.trim())
  }

  return lines.join('\n')
}

export function renderJourney(journey: Journey): string {
  const display = deriveJourneyDisplay(journey)
  const lines: string[] = []
  const dep = formatTime12(display.earliestDeparture)
  const arr = formatTime12(display.latestArrival)
  const bookedCount = journey.legs.filter(
    (l) => l.booking_status === 'booked' || l.booking_status === 'not_needed'
  ).length
  const totalLegs = journey.legs.length
  const bookedSuffix = totalLegs > 0 ? ` · ${bookedCount}/${totalLegs} booked-or-not-needed` : ''
  const timeSuffix = dep && arr ? ` · ${dep}–${arr}` : dep ? ` · from ${dep}` : ''
  lines.push(`**${display.title}**${timeSuffix}${bookedSuffix}`)

  if (totalLegs === 0) {
    lines.push('  _(no legs)_')
    return lines.join('\n')
  }

  for (const leg of journey.legs) {
    const mode = MODE_LABELS[leg.mode] ?? leg.mode
    const legDep = formatTime12(leg.departure_time)
    const legArr = formatTime12(leg.arrival_time)
    const timing = legDep && legArr ? `${legDep}–${legArr}` : legDep ? `from ${legDep}` : ''
    const status =
      leg.booking_status === 'booked'
        ? '✓ booked'
        : leg.booking_status === 'not_needed'
          ? 'not needed'
          : 'not booked'
    const confirm = leg.confirmation ? ` (${leg.confirmation})` : ''
    const notes = leg.notes && leg.notes.trim() ? ` — ${truncate(leg.notes.trim(), 120)}` : ''
    lines.push(
      `  - ${mode}: ${leg.origin_name} → ${leg.destination_name}${timing ? ` · ${timing}` : ''} · ${status}${confirm}${notes}`
    )
  }

  if (journey.parent.notes && journey.parent.notes.trim()) {
    lines.push('')
    lines.push(`  _Notes: ${journey.parent.notes.trim()}_`)
  }

  return lines.join('\n')
}

interface DayContent {
  day: TripDay
  items: ItineraryItemWithPlace[]
  journeys: Journey[]
}

export function renderDay(content: DayContent): string {
  const { day, items, journeys } = content
  const lines: string[] = []
  lines.push(`### Day ${day.dayNumber} — ${formatTripDate(day.date)} (${day.label})`)

  if (items.length === 0 && journeys.length === 0) {
    lines.push('')
    lines.push('_(unplanned)_')
    return lines.join('\n')
  }

  // Group by slot
  const bySlot = new Map<TimeSlot, { items: ItineraryItemWithPlace[]; journeys: Journey[] }>()
  for (const item of items) {
    const slot = item.time_slot as TimeSlot
    const entry = bySlot.get(slot) ?? { items: [], journeys: [] }
    entry.items.push(item)
    bySlot.set(slot, entry)
  }
  for (const j of journeys) {
    const slot = j.parent.time_slot as TimeSlot
    const entry = bySlot.get(slot) ?? { items: [], journeys: [] }
    entry.journeys.push(j)
    bySlot.set(slot, entry)
  }

  const orderedSlots = Array.from(bySlot.keys()).sort(
    (a, b) => (TIME_SLOT_ORDER[a] ?? 999) - (TIME_SLOT_ORDER[b] ?? 999)
  )

  lines.push('')
  for (const slot of orderedSlots) {
    const { items: slotItems, journeys: slotJourneys } = bySlot.get(slot)!
    const slotLabel = TIME_SLOT_LABELS[slot] ?? slot
    const merged: { sort: number; line: string }[] = []
    for (const item of slotItems) {
      const name =
        item.place?.name ?? (item.text_note ? truncate(item.text_note, 80) : '(empty item)')
      const time = formatTime12(item.reservation_time)
      const timePart = time ? ` (${time})` : ''
      const decided = item.is_decided ? '' : ' [speculative]'
      const star = item.place && placeMustGo(item.place) ? ' ⭐' : ''
      merged.push({
        sort: item.sort_order,
        line: `- ${name}${star}${timePart}${decided}`,
      })
    }
    for (const j of slotJourneys) {
      const d = deriveJourneyDisplay(j)
      const dep = formatTime12(d.earliestDeparture)
      const timePart = dep ? ` (${dep})` : ''
      merged.push({
        sort: j.parent.sort_order,
        line: `- 🚆 ${d.title}${timePart}`,
      })
    }
    merged.sort((a, b) => a.sort - b.sort)

    lines.push(`**${slotLabel}**`)
    for (const m of merged) lines.push(m.line)
    lines.push('')
  }

  // Trim trailing blank
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// File composers
// ---------------------------------------------------------------------------

function placeBelongsToCity(place: PlaceRow, city: City): boolean {
  return place.city === city
}

function hotelInCity(hotel: AccommodationRow, city: City): boolean {
  return hotel.city === city
}

function journeyTouchesCity(journey: Journey, city: City, bundle: TripBundle): boolean {
  // A journey "touches" a city if its day_date is one of that city's days.
  const day = getDayByDate(journey.parent.day_date)
  if (day && day.cities.includes(city)) return true
  // Or if any leg's origin/destination matches a place in that city.
  for (const leg of journey.legs) {
    if (leg.origin_place_id) {
      const p = bundle.placesById.get(leg.origin_place_id)
      if (p?.city === city) return true
    }
    if (leg.destination_place_id) {
      const p = bundle.placesById.get(leg.destination_place_id)
      if (p?.city === city) return true
    }
  }
  return false
}

function renderCityFile(city: City, bundle: TripBundle): string {
  const days = getDaysForCity(city)
  const hotels = bundle.accommodations.filter((h) => hotelInCity(h, city))
  const cityPlaces = bundle.places
    .filter((p) => placeBelongsToCity(p, city))
    .filter((p) => !p.parent_place_id) // top-level only; children rendered inline

  // Scheduled vs backlog vs archived
  const scheduledIds = new Set(
    bundle.itineraryItems
      .filter((i) => {
        const day = getDayByDate(i.day_date)
        return day?.cities.includes(city)
      })
      .map((i) => i.place_id)
      .filter((id): id is string => !!id)
  )

  const scheduled = cityPlaces.filter((p) => !placeArchived(p) && scheduledIds.has(p.id))
  const backlog = cityPlaces.filter((p) => !placeArchived(p) && !scheduledIds.has(p.id))
  const archived = cityPlaces.filter(placeArchived)

  // Order scheduled by earliest scheduled day/slot
  scheduled.sort((a, b) => {
    const aFirst = firstScheduledMoment(a, bundle, city)
    const bFirst = firstScheduledMoment(b, bundle, city)
    return aFirst - bFirst
  })

  // Backlog: must-go first, then alphabetical within each tier
  backlog.sort((a, b) => {
    const aMust = placeMustGo(a) ? 0 : 1
    const bMust = placeMustGo(b) ? 0 : 1
    if (aMust !== bMust) return aMust - bMust
    return a.name.localeCompare(b.name)
  })

  archived.sort((a, b) => a.name.localeCompare(b.name))

  // Journeys
  const cityJourneys = bundle.journeys.filter((j) => journeyTouchesCity(j, city, bundle))
  cityJourneys.sort((a, b) => {
    const dateCmp = a.parent.day_date.localeCompare(b.parent.day_date)
    if (dateCmp !== 0) return dateCmp
    const slotCmp =
      (TIME_SLOT_ORDER[a.parent.time_slot as TimeSlot] ?? 999) -
      (TIME_SLOT_ORDER[b.parent.time_slot as TimeSlot] ?? 999)
    if (slotCmp !== 0) return slotCmp
    return a.parent.sort_order - b.parent.sort_order
  })

  // Frontmatter
  const firstDay = days[0]?.date
  const lastDay = days[days.length - 1]?.date
  const nights = days.length - 1 > 0 ? days.length - 1 : days.length
  const fm: string[] = ['---']
  fm.push(`city: ${city}`)
  if (firstDay && lastDay) fm.push(`dates: ${firstDay} → ${lastDay}`)
  fm.push(`nights: ${nights}`)
  if (hotels.length > 0) {
    const hotelNames = hotels.map((h) => h.name).join(', ')
    fm.push(`hotels: ${hotelNames}`)
  }
  fm.push(`generated_at: ${bundle.generatedAt}`)
  fm.push('---')

  const out: string[] = []
  out.push(fm.join('\n'))
  out.push('')
  out.push(`# ${CITY_LABELS[city]}`)
  out.push('')

  // Overview
  out.push('## Overview')
  out.push('')
  if (firstDay && lastDay) {
    out.push(`- **Dates:** ${formatTripDate(firstDay)} → ${formatTripDate(lastDay)}`)
  }
  out.push(`- **Days in city:** ${days.length}`)
  if (hotels.length > 0) {
    out.push(`- **Hotels:** ${hotels.map((h) => h.name).join(', ')}`)
  }
  out.push(`- **Scheduled places:** ${scheduled.length}`)
  out.push(`- **Backlog (unscheduled candidates):** ${backlog.length}`)
  out.push(`- **Archived (rejected):** ${archived.length}`)
  out.push('')

  // Day-by-day schedule
  out.push('## Day-by-day schedule')
  out.push('')
  for (const day of days) {
    const items = (bundle.itemsByDay.get(day.date) ?? []).slice()
    const journeysForDay = (bundle.journeysByDay.get(day.date) ?? []).slice()
    out.push(renderDay({ day, items, journeys: journeysForDay }))
    out.push('')
  }

  // Places (scheduled)
  out.push('## Places (scheduled)')
  out.push('')
  if (scheduled.length === 0) {
    out.push('_(none yet)_')
    out.push('')
  } else {
    for (const p of scheduled) {
      out.push(renderPlace(p, bundle))
      out.push('')
    }
  }

  // Places (backlog)
  out.push('## Places (backlog)')
  out.push('')
  out.push('_Unscheduled candidates. Must-go (⭐) shown first; remainder alphabetical._')
  out.push('')
  if (backlog.length === 0) {
    out.push('_(empty)_')
    out.push('')
  } else {
    for (const p of backlog) {
      out.push(renderPlace(p, bundle))
      out.push('')
    }
  }

  // Hotels
  out.push('## Hotels')
  out.push('')
  if (hotels.length === 0) {
    out.push('_(none)_')
    out.push('')
  } else {
    for (const h of hotels) {
      out.push(renderHotel(h))
      out.push('')
    }
  }

  // Journeys
  out.push('## Journeys')
  out.push('')
  out.push(
    '_Includes intra-city journeys and cross-city journeys with this city as origin or destination._'
  )
  out.push('')
  if (cityJourneys.length === 0) {
    out.push('_(none)_')
    out.push('')
  } else {
    for (const j of cityJourneys) {
      const day = getDayByDate(j.parent.day_date)
      const dayLabel = day
        ? `Day ${day.dayNumber} (${formatTripDate(j.parent.day_date)})`
        : j.parent.day_date
      out.push(`#### ${dayLabel}`)
      out.push('')
      out.push(renderJourney(j))
      out.push('')
    }
  }

  // Archived
  out.push('## Archived')
  out.push('')
  out.push('_Intentionally rejected — do NOT re-suggest as fresh ideas. Listed for context._')
  out.push('')
  if (archived.length === 0) {
    out.push('_(none)_')
    out.push('')
  } else {
    for (const p of archived) {
      out.push(renderPlaceArchived(p))
    }
    out.push('')
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

function firstScheduledMoment(place: PlaceRow, bundle: TripBundle, city: City): number {
  const items = bundle.itineraryItems.filter((i) => {
    if (i.place_id !== place.id) return false
    const day = getDayByDate(i.day_date)
    return day?.cities.includes(city)
  })
  if (items.length === 0) return Number.MAX_SAFE_INTEGER
  const sorted = items.slice().sort((a, b) => {
    const dateCmp = a.day_date.localeCompare(b.day_date)
    if (dateCmp !== 0) return dateCmp
    const slotCmp =
      (TIME_SLOT_ORDER[a.time_slot as TimeSlot] ?? 999) -
      (TIME_SLOT_ORDER[b.time_slot as TimeSlot] ?? 999)
    if (slotCmp !== 0) return slotCmp
    return a.sort_order - b.sort_order
  })
  const first = sorted[0]
  const day = getDayByDate(first.day_date)
  const dayOrdinal = day?.dayNumber ?? 0
  const slotOrdinal = TIME_SLOT_ORDER[first.time_slot as TimeSlot] ?? 0
  return dayOrdinal * 10000 + slotOrdinal * 100 + first.sort_order
}

function renderReadme(bundle: TripBundle): string {
  const out: string[] = []
  out.push(`# Japan Honeymoon — Trip Context`)
  out.push('')
  out.push(
    `_Generated ${bundle.generatedAt}. This directory is the canonical snapshot of the current trip state for AI-agent planning conversations. Regenerate with \`npm run export-context\`._`
  )
  out.push('')

  // Top-line counts
  const placeCount = bundle.places.filter((p) => !p.parent_place_id).length
  const childCount = bundle.places.filter((p) => p.parent_place_id).length
  const scheduledItemCount = bundle.itineraryItems.filter((i) => i.place_id).length
  out.push('## At a glance')
  out.push('')
  out.push(
    `- **Dates:** ${formatTripDate(TRIP_DAYS[0].date)} → ${formatTripDate(TRIP_DAYS[TRIP_DAYS.length - 1].date)} (${TRIP_DAYS.length} days)`
  )
  out.push(`- **Cities:** ${CITIES.map((c) => CITY_LABELS[c]).join(' → ')}`)
  out.push(`- **Hotels booked:** ${bundle.accommodations.length}`)
  out.push(`- **Top-level places:** ${placeCount} (plus ${childCount} children)`)
  out.push(`- **Scheduled items:** ${scheduledItemCount}`)
  out.push(`- **Journeys (transport):** ${bundle.journeys.length}`)
  out.push(`- **Notes:** ${bundle.notes.length}`)
  out.push('')

  // 16-day chronology table
  out.push('## Day-by-day overview')
  out.push('')
  out.push('| Day | Date | City | Hotel | Highlights |')
  out.push('| --- | --- | --- | --- | --- |')
  for (const day of TRIP_DAYS) {
    const items = (bundle.itemsByDay.get(day.date) ?? []).slice().sort((a, b) => {
      const slotCmp =
        (TIME_SLOT_ORDER[a.time_slot as TimeSlot] ?? 999) -
        (TIME_SLOT_ORDER[b.time_slot as TimeSlot] ?? 999)
      if (slotCmp !== 0) return slotCmp
      return a.sort_order - b.sort_order
    })
    const highlights =
      items.length === 0
        ? '_(unplanned)_'
        : items
            .map((i) => {
              const name = i.place?.name ?? (i.text_note ? truncate(i.text_note, 40) : '?')
              return placeMustGo(i.place ?? ({ priority: 'default' } as PlaceRow))
                ? `${name} ⭐`
                : name
            })
            .join(', ')
    const hotelName = hotelForDate(day.date, bundle.accommodations)?.name ?? '—'
    out.push(
      `| ${day.dayNumber} | ${formatTripDate(day.date)} | ${day.label} | ${hotelName} | ${escapeTableCell(highlights)} |`
    )
  }
  out.push('')

  // ToC
  out.push('## Files in this directory')
  out.push('')
  for (const city of CITIES) {
    out.push(
      `- [${CITY_LABELS[city]}](./${city}.md) — places, hotels, journeys, and day-by-day for ${CITY_LABELS[city]}`
    )
  }
  out.push(`- [Notes](./notes.md) — freeform trip notes (not tied to any city)`)
  out.push('')

  // How to use this snapshot
  out.push('## How to use this snapshot')
  out.push('')
  out.push('- These files are a **read-only** view of the live Supabase data.')
  out.push(
    '- To make actual changes to the trip, use the app or Supabase MCP tools — do NOT edit `exports/*`.'
  )
  out.push(
    "- The data was current as of `generated_at` in each file's frontmatter; if you suspect drift, re-run `npm run export-context`."
  )
  out.push('- `⭐` = must-go place (explicit upvote).')
  out.push('- Speculative itinerary items are tagged `[speculative]`; decided items are unadorned.')
  out.push(
    '- The `## Archived` section per city lists places intentionally rejected — do not re-pitch them as fresh ideas.'
  )

  return out.join('\n')
}

function escapeTableCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function hotelForDate(date: string, hotels: AccommodationRow[]): AccommodationRow | null {
  // Hotel where you're sleeping that night: check_in_date <= date < check_out_date
  const match = hotels.find((h) => h.check_in_date <= date && date < h.check_out_date)
  return match ?? null
}

function nightCount(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000))
}

function renderNotesFile(notes: NoteRow[]): string {
  const out: string[] = []
  out.push('# Trip Notes')
  out.push('')
  out.push('_Freeform notes not tied to a specific city or day._')
  out.push('')
  if (notes.length === 0) {
    out.push('_(none)_')
    return out.join('\n')
  }
  for (const note of notes) {
    out.push(`## ${note.title}`)
    out.push('')
    if (note.body && note.body.trim()) {
      out.push(note.body.trim())
      out.push('')
    } else {
      out.push('_(empty)_')
      out.push('')
    }
  }
  return out.join('\n')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = Date.now()
  const supabase = buildSupabaseClient()
  console.log('Fetching trip data from Supabase…')
  const bundle = await fetchTripData(supabase)
  console.log(
    `  places: ${bundle.places.length} (${bundle.places.filter((p) => !p.parent_place_id).length} top-level)`
  )
  console.log(`  accommodations: ${bundle.accommodations.length}`)
  console.log(`  itinerary_items: ${bundle.itineraryItems.length}`)
  console.log(
    `  journeys: ${bundle.journeys.length} (${bundle.journeys.reduce((n, j) => n + j.legs.length, 0)} legs)`
  )
  console.log(`  notes: ${bundle.notes.length}`)

  console.log(`Wiping ${OUT_DIR}…`)
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  console.log('Rendering files…')
  await writeFile(resolve(OUT_DIR, 'README.md'), renderReadme(bundle))
  for (const city of CITIES) {
    await writeFile(resolve(OUT_DIR, `${city}.md`), renderCityFile(city, bundle))
  }
  await writeFile(resolve(OUT_DIR, 'notes.md'), renderNotesFile(bundle.notes))

  const elapsed = Date.now() - startedAt
  console.log(`Done in ${elapsed}ms. Output: ${OUT_DIR}`)
}

// Run main() only when invoked as the CLI entry, not when imported by tests.
const ENTRY_PATH = process.argv[1] ? resolve(process.argv[1]) : ''
if (fileURLToPath(import.meta.url) === ENTRY_PATH) {
  main().catch((err) => {
    console.error('Export failed:', err)
    process.exit(1)
  })
}

// Re-exports for tests
export {
  renderNotesFile,
  renderCityFile,
  renderReadme,
  hotelForDate,
  nightCount,
  formatTime12,
  truncate,
  type TripBundle,
}
