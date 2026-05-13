import { describe, expect, it } from 'vitest'
import {
  renderHours,
  renderPlace,
  renderPlaceArchived,
  renderJourney,
  renderDay,
  renderHotel,
  renderNotesFile,
  formatTime12,
  nightCount,
  hotelForDate,
  type TripBundle,
} from '../../scripts/export-context'
import type { PlaceRow } from '@/types/places'
import type { ItineraryItemWithPlace } from '@/types/itinerary'
import type { Journey } from '@/types/transport'
import type { AccommodationRow } from '@/types/accommodations'
import { TRIP_DAYS } from '@/config/trip'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makePlace(overrides: Partial<PlaceRow> = {}): PlaceRow {
  return {
    id: overrides.id ?? 'place-1',
    google_place_id: null,
    name: 'Test Place',
    address: '1-1 Test, Tokyo',
    lat: 35.0,
    lng: 139.0,
    rating: 4.5,
    price_level: null,
    hours: null,
    website: null,
    phone: null,
    photos: null,
    tags: null,
    category: 'restaurant',
    priority: 'default',
    status: 'researching',
    city: 'tokyo',
    notes: null,
    parent_place_id: null,
    child_sort_order: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as PlaceRow
}

function makeBundle(
  places: PlaceRow[] = [],
  itineraryItems: ItineraryItemWithPlace[] = []
): TripBundle {
  const placesById = new Map(places.map((p) => [p.id, p]))
  const childrenByParent = new Map<string, PlaceRow[]>()
  for (const p of places) {
    if (p.parent_place_id) {
      const arr = childrenByParent.get(p.parent_place_id) ?? []
      arr.push(p)
      childrenByParent.set(p.parent_place_id, arr)
    }
  }
  const itemsByDay = new Map<string, ItineraryItemWithPlace[]>()
  for (const i of itineraryItems) {
    const arr = itemsByDay.get(i.day_date) ?? []
    arr.push(i)
    itemsByDay.set(i.day_date, arr)
  }
  const scheduledDatesByPlace = new Map<string, string[]>()
  for (const i of itineraryItems) {
    if (!i.place_id) continue
    const arr = scheduledDatesByPlace.get(i.place_id) ?? []
    if (!arr.includes(i.day_date)) arr.push(i.day_date)
    scheduledDatesByPlace.set(i.place_id, arr)
  }
  return {
    places,
    accommodations: [],
    itineraryItems,
    journeys: [],
    notes: [],
    placesById,
    childrenByParent,
    itemsByDay,
    journeysByDay: new Map(),
    scheduledDatesByPlace,
    generatedAt: '2026-05-12T00:00:00Z',
  }
}

// ---------------------------------------------------------------------------
// renderHours
// ---------------------------------------------------------------------------

describe('renderHours', () => {
  it('returns null for null/undefined/empty', () => {
    expect(renderHours(null)).toBeNull()
    expect(renderHours(undefined)).toBeNull()
    expect(renderHours({})).toBeNull()
  })

  it('renders weekday_text array compactly', () => {
    const hours = {
      weekday_text: ['Monday: 9:00 AM – 5:00 PM', 'Tuesday: 9:00 AM – 5:00 PM', 'Sunday: Closed'],
    }
    const result = renderHours(hours)
    expect(result).toContain('Mon')
    expect(result).toContain('Sun Closed')
    expect(result).toContain(';')
  })

  it('handles a bare string array (Google-style without wrapper)', () => {
    const result = renderHours(['Monday: 9 AM – 5 PM', 'Sunday: Closed'])
    expect(result).toContain('Mon 9 AM – 5 PM')
    expect(result).toContain('Sun Closed')
  })

  it('renders a day→range map', () => {
    const result = renderHours({ monday: '9-17', tuesday: 'closed', wednesday: '9-12' })
    expect(result).toBe('Mon 9-17, Tue closed, Wed 9-12')
  })
})

// ---------------------------------------------------------------------------
// renderPlace
// ---------------------------------------------------------------------------

describe('renderPlace', () => {
  it('renders a basic place with no must-go star and no scheduled line', () => {
    const place = makePlace({ name: 'Ramen Shop', rating: 4.2 })
    const bundle = makeBundle([place])
    const md = renderPlace(place, bundle)
    expect(md).toContain('### Ramen Shop')
    expect(md).not.toContain('⭐')
    expect(md).toContain('Rating: 4.2')
    expect(md).toContain('1-1 Test, Tokyo')
  })

  it('marks must-go places with a star in the heading', () => {
    const place = makePlace({ name: 'Top Pick', priority: 'must_go' })
    const bundle = makeBundle([place])
    const md = renderPlace(place, bundle)
    expect(md).toMatch(/^### Top Pick ⭐/m)
  })

  it('skips empty/null metadata lines (no `Phone: —` etc)', () => {
    const place = makePlace({ phone: null, website: null, rating: null, address: null })
    const bundle = makeBundle([place])
    const md = renderPlace(place, bundle)
    expect(md).not.toContain('Phone:')
    expect(md).not.toContain('Website:')
    expect(md).not.toContain('Rating:')
    expect(md).not.toContain('—')
  })

  it('renders a scheduled line for items the place is on', () => {
    const place = makePlace({ id: 'p1', name: 'Sushi Bar' })
    const item: ItineraryItemWithPlace = {
      id: 'i1',
      place_id: 'p1',
      day_date: '2026-05-17',
      text_note: null,
      time_slot: 'dinner',
      sort_order: 0,
      is_decided: true,
      reservation_time: '19:30:00',
      reservation_notes: null,
      images: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      place: place,
    } as ItineraryItemWithPlace
    const bundle = makeBundle([place], [item])
    const md = renderPlace(place, bundle)
    expect(md).toContain('Scheduled:')
    expect(md).toMatch(/Dinner.*7:30 PM/)
    expect(md).not.toContain('speculative')
  })

  it('marks speculative items in the scheduled line', () => {
    const place = makePlace({ id: 'p1' })
    const item = {
      id: 'i1',
      place_id: 'p1',
      day_date: '2026-05-17',
      text_note: null,
      time_slot: 'morning',
      sort_order: 0,
      is_decided: false,
      reservation_time: null,
      reservation_notes: null,
      images: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      place: place,
    } as ItineraryItemWithPlace
    const bundle = makeBundle([place], [item])
    const md = renderPlace(place, bundle)
    expect(md).toContain('(speculative)')
  })

  it('renders a parent place with a children sub-list', () => {
    const parent = makePlace({ id: 'parent', name: 'Aoyama Block' })
    const c1 = makePlace({
      id: 'c1',
      name: 'COMME des GARÇONS',
      parent_place_id: 'parent',
      child_sort_order: 0,
    })
    const c2 = makePlace({
      id: 'c2',
      name: 'sacai Aoyama',
      parent_place_id: 'parent',
      child_sort_order: 1,
      priority: 'must_go',
    })
    const bundle = makeBundle([parent, c1, c2])
    const md = renderPlace(parent, bundle)
    expect(md).toContain('**Children (2):**')
    expect(md).toContain('- COMME des GARÇONS')
    expect(md).toContain('- sacai Aoyama ⭐')
  })

  it('renders the parent breadcrumb on a child place', () => {
    const parent = makePlace({ id: 'parent', name: 'Aoyama Block' })
    const child = makePlace({ id: 'c1', parent_place_id: 'parent', name: 'CDG' })
    const bundle = makeBundle([parent, child])
    const md = renderPlace(child, bundle)
    expect(md).toContain('Part of: **Aoyama Block**')
  })
})

// ---------------------------------------------------------------------------
// renderPlaceArchived
// ---------------------------------------------------------------------------

describe('renderPlaceArchived', () => {
  it('renders a terse one-liner with category and reason', () => {
    const place = makePlace({
      name: 'Bamboo Forest',
      category: 'nature_park',
      notes: 'Too touristy, skipping',
      priority: 'archived',
    })
    const md = renderPlaceArchived(place)
    expect(md).toBe('- **Bamboo Forest** *(Nature / Park)* — Too touristy, skipping')
  })

  it('omits the reason suffix when notes are empty', () => {
    const place = makePlace({
      name: 'Whatever',
      notes: null,
      priority: 'archived',
    })
    const md = renderPlaceArchived(place)
    expect(md).toBe('- **Whatever** *(Restaurant)*')
  })
})

// ---------------------------------------------------------------------------
// renderJourney
// ---------------------------------------------------------------------------

describe('renderJourney', () => {
  function makeJourney(legs: Array<Partial<Journey['legs'][number]>>): Journey {
    return {
      parent: {
        id: 'j1',
        day_date: '2026-05-22',
        time_slot: 'morning',
        sort_order: 0,
        title: null,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      legs: legs.map((l, i) => ({
        id: `leg-${i}`,
        transport_id: 'j1',
        leg_index: i,
        mode: 'local_train',
        origin_name: 'A',
        destination_name: 'B',
        origin_place_id: null,
        destination_place_id: null,
        origin_lat: null,
        origin_lng: null,
        destination_lat: null,
        destination_lng: null,
        departure_time: '09:00:00',
        arrival_time: '10:00:00',
        booking_status: 'not_booked',
        confirmation: null,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...l,
      })) as Journey['legs'],
    }
  }

  it('renders a single-leg journey with header and one indented leg', () => {
    const j = makeJourney([
      {
        mode: 'shinkansen',
        origin_name: 'Tokyo',
        destination_name: 'Kyoto',
        departure_time: '09:00:00',
        arrival_time: '12:15:00',
        booking_status: 'booked',
        confirmation: 'ABC123',
      },
    ])
    const md = renderJourney(j)
    expect(md).toContain('**Tokyo → Kyoto**')
    expect(md).toContain('9:00 AM–12:15 PM')
    expect(md).toContain('1/1 booked-or-not-needed')
    expect(md).toContain('  - Shinkansen: Tokyo → Kyoto')
    expect(md).toContain('✓ booked')
    expect(md).toContain('(ABC123)')
  })

  it('renders a multi-leg journey with a mix of booking statuses', () => {
    const j = makeJourney([
      {
        mode: 'local_train',
        origin_name: 'Hakone',
        destination_name: 'Odawara',
        departure_time: '09:00:00',
        arrival_time: '09:15:00',
        booking_status: 'not_needed',
      },
      {
        mode: 'shinkansen',
        origin_name: 'Odawara',
        destination_name: 'Kyoto',
        departure_time: '09:35:00',
        arrival_time: '12:34:00',
        booking_status: 'not_booked',
      },
    ])
    const md = renderJourney(j)
    expect(md).toContain('1/2 booked-or-not-needed')
    expect(md).toContain('not needed')
    expect(md).toContain('not booked')
  })

  it('handles legs with missing arrival_time gracefully', () => {
    const j = makeJourney([
      {
        mode: 'taxi',
        origin_name: 'X',
        destination_name: 'Y',
        departure_time: '10:00:00',
        arrival_time: null,
        booking_status: 'not_needed',
      },
    ])
    const md = renderJourney(j)
    expect(md).toContain('Taxi: X → Y')
    expect(md).toContain('from 10:00 AM')
  })

  it('renders a header even when there are no legs', () => {
    const j = makeJourney([])
    const md = renderJourney(j)
    expect(md).toContain('**Transport**')
    expect(md).toContain('_(no legs)_')
  })
})

// ---------------------------------------------------------------------------
// renderDay
// ---------------------------------------------------------------------------

describe('renderDay', () => {
  const day = TRIP_DAYS[1] // Day 2, Tokyo

  it('renders an unplanned day with a marker', () => {
    const md = renderDay({ day, items: [], journeys: [] })
    expect(md).toContain('### Day 2')
    expect(md).toContain('_(unplanned)_')
  })

  it('groups items by slot in chronological slot order', () => {
    const place = makePlace({ id: 'p1', name: 'Cafe Morning' })
    const place2 = makePlace({ id: 'p2', name: 'Dinner Spot' })
    const items: ItineraryItemWithPlace[] = [
      {
        id: 'i2',
        place_id: 'p2',
        day_date: day.date,
        text_note: null,
        time_slot: 'dinner',
        sort_order: 0,
        is_decided: true,
        reservation_time: '19:00:00',
        reservation_notes: null,
        images: null,
        created_at: '',
        updated_at: '',
        place: place2,
      } as ItineraryItemWithPlace,
      {
        id: 'i1',
        place_id: 'p1',
        day_date: day.date,
        text_note: null,
        time_slot: 'breakfast',
        sort_order: 0,
        is_decided: true,
        reservation_time: null,
        reservation_notes: null,
        images: null,
        created_at: '',
        updated_at: '',
        place: place,
      } as ItineraryItemWithPlace,
    ]
    const md = renderDay({ day, items, journeys: [] })
    const breakfastIdx = md.indexOf('**Breakfast**')
    const dinnerIdx = md.indexOf('**Dinner**')
    expect(breakfastIdx).toBeGreaterThan(-1)
    expect(dinnerIdx).toBeGreaterThan(breakfastIdx) // Breakfast before Dinner
    expect(md).toContain('- Cafe Morning')
    expect(md).toContain('- Dinner Spot (7:00 PM)')
  })

  it('mixes journeys and items in the same slot, ordered by sort_order', () => {
    const place = makePlace({ id: 'p1', name: 'Lunch' })
    const items: ItineraryItemWithPlace[] = [
      {
        id: 'i1',
        place_id: 'p1',
        day_date: day.date,
        text_note: null,
        time_slot: 'lunch',
        sort_order: 1,
        is_decided: true,
        reservation_time: null,
        reservation_notes: null,
        images: null,
        created_at: '',
        updated_at: '',
        place: place,
      } as ItineraryItemWithPlace,
    ]
    const journeys: Journey[] = [
      {
        parent: {
          id: 'j1',
          day_date: day.date,
          time_slot: 'lunch',
          sort_order: 0,
          title: null,
          notes: null,
          created_at: '',
          updated_at: '',
        },
        legs: [
          {
            id: 'l1',
            transport_id: 'j1',
            leg_index: 0,
            mode: 'subway',
            origin_name: 'A',
            destination_name: 'B',
            origin_place_id: null,
            destination_place_id: null,
            origin_lat: null,
            origin_lng: null,
            destination_lat: null,
            destination_lng: null,
            departure_time: '12:30:00',
            arrival_time: '12:45:00',
            booking_status: 'not_needed',
            confirmation: null,
            notes: null,
            created_at: '',
            updated_at: '',
          },
        ],
      } as Journey,
    ]
    const md = renderDay({ day, items, journeys })
    const transportIdx = md.indexOf('🚆')
    const lunchPlaceIdx = md.indexOf('- Lunch')
    expect(transportIdx).toBeGreaterThan(-1)
    expect(lunchPlaceIdx).toBeGreaterThan(transportIdx) // sort_order 0 before 1
  })
})

// ---------------------------------------------------------------------------
// Hotel + small helpers
// ---------------------------------------------------------------------------

describe('renderHotel', () => {
  it('renders a hotel with dates, nights, and confirmation', () => {
    const hotel = {
      id: 'h1',
      name: 'Ace Hotel Kyoto',
      city: 'kyoto',
      check_in_date: '2026-05-24',
      check_out_date: '2026-05-27',
      check_in_time: '15:00:00',
      check_out_time: '12:00:00',
      address: '245 Kurumayachō, Kyoto',
      lat: null,
      lng: null,
      website: 'https://acehotel.com/kyoto',
      confirmation_numbers: ['ABC123'],
      booking_url: null,
      booked_by: 'Mac',
      google_place_id: null,
      rating: 4.6,
      photos: null,
      tags: [],
      notes: null,
      phone: null,
      created_at: '',
      updated_at: '',
    } as AccommodationRow
    const md = renderHotel(hotel)
    expect(md).toContain('### Ace Hotel Kyoto')
    expect(md).toContain('Sun, May 24 → Wed, May 27 (3 nights)')
    expect(md).toContain('check-in 3:00 PM')
    expect(md).toContain('check-out 12:00 PM')
    expect(md).toContain('Confirmations: ABC123')
    expect(md).toContain('Booked by: Mac')
  })
})

describe('hotelForDate', () => {
  it('finds the hotel where the user is sleeping that night', () => {
    const hotels = [
      { check_in_date: '2026-05-16', check_out_date: '2026-05-22', name: 'Tokyo A' },
      { check_in_date: '2026-05-22', check_out_date: '2026-05-24', name: 'Hakone B' },
    ] as unknown as AccommodationRow[]
    expect(hotelForDate('2026-05-16', hotels)?.name).toBe('Tokyo A')
    expect(hotelForDate('2026-05-21', hotels)?.name).toBe('Tokyo A')
    expect(hotelForDate('2026-05-22', hotels)?.name).toBe('Hakone B') // checkout day = new hotel
    expect(hotelForDate('2026-05-24', hotels)).toBeNull() // checkout day of last hotel
  })
})

describe('formatTime12 / nightCount', () => {
  it('formats 24-hour times to 12-hour', () => {
    expect(formatTime12('09:00:00')).toBe('9:00 AM')
    expect(formatTime12('19:30:00')).toBe('7:30 PM')
    expect(formatTime12('00:00:00')).toBe('12:00 AM')
    expect(formatTime12('12:00:00')).toBe('12:00 PM')
    expect(formatTime12(null)).toBeNull()
    expect(formatTime12('garbage')).toBeNull()
  })

  it('counts nights between two dates', () => {
    expect(nightCount('2026-05-24', '2026-05-27')).toBe(3)
    expect(nightCount('2026-05-24', '2026-05-25')).toBe(1)
    expect(nightCount('2026-05-24', '2026-05-24')).toBe(0)
  })
})

describe('renderNotesFile', () => {
  it('renders multiple notes with titles and bodies', () => {
    const md = renderNotesFile([
      {
        id: '1',
        title: 'First',
        body: 'body of first',
        sort_order: 0,
        images: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        title: 'Second',
        body: null,
        sort_order: 1,
        images: null,
        created_at: '',
        updated_at: '',
      },
    ])
    expect(md).toContain('## First')
    expect(md).toContain('body of first')
    expect(md).toContain('## Second')
    expect(md).toContain('_(empty)_')
  })

  it('renders an empty notes file with a marker', () => {
    const md = renderNotesFile([])
    expect(md).toContain('# Trip Notes')
    expect(md).toContain('_(none)_')
  })
})
