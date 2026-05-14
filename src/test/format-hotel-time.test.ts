import { describe, it, expect } from 'vitest'
import { formatHotelTimePill, itemKind } from '@/types/itinerary'
import type { ItineraryItemRow } from '@/types/itinerary'

// formatHotelTimePill — 4 time states × check-in / check-out
describe('formatHotelTimePill', () => {
  describe('check-in', () => {
    it('both set: shows planned with policy in parentheses using "from"', () => {
      expect(formatHotelTimePill({ planned: '18:00', policy: '15:00', role: 'checkin' })).toBe(
        '6:00 PM (from 3:00 PM)'
      )
    })

    it('planned only: shows just planned', () => {
      expect(formatHotelTimePill({ planned: '18:00', policy: null, role: 'checkin' })).toBe(
        '6:00 PM'
      )
    })

    it('policy only: shows policy with "from" preposition', () => {
      expect(formatHotelTimePill({ planned: null, policy: '15:00', role: 'checkin' })).toBe(
        'from 3:00 PM'
      )
    })

    it('neither set: shows "time TBD"', () => {
      expect(formatHotelTimePill({ planned: null, policy: null, role: 'checkin' })).toBe('time TBD')
    })
  })

  describe('check-out', () => {
    it('both set: shows planned with policy in parentheses using "by"', () => {
      expect(formatHotelTimePill({ planned: '09:00', policy: '11:00', role: 'checkout' })).toBe(
        '9:00 AM (by 11:00 AM)'
      )
    })

    it('planned only: shows just planned', () => {
      expect(formatHotelTimePill({ planned: '09:00', policy: null, role: 'checkout' })).toBe(
        '9:00 AM'
      )
    })

    it('policy only: shows policy with "by" preposition', () => {
      expect(formatHotelTimePill({ planned: null, policy: '11:00', role: 'checkout' })).toBe(
        'by 11:00 AM'
      )
    })

    it('neither set: shows "time TBD"', () => {
      expect(formatHotelTimePill({ planned: null, policy: null, role: 'checkout' })).toBe(
        'time TBD'
      )
    })
  })

  it('handles HH:MM:SS input (full TIME column shape)', () => {
    expect(formatHotelTimePill({ planned: '18:00:00', policy: '15:00:00', role: 'checkin' })).toBe(
      '6:00 PM (from 3:00 PM)'
    )
  })
})

// itemKind — discriminator helper. Mirrors the DB content_check exactly: a
// well-formed row has exactly one of place_id / text_note / accommodation_id.
describe('itemKind', () => {
  const base: Pick<
    ItineraryItemRow,
    'place_id' | 'text_note' | 'accommodation_id' | 'hotel_event_role'
  > = {
    place_id: null,
    text_note: null,
    accommodation_id: null,
    hotel_event_role: null,
  }

  it('returns "place" when only place_id is set', () => {
    expect(itemKind({ ...base, place_id: 'p1' })).toBe('place')
  })

  it('returns "text_note" when only text_note is set', () => {
    expect(itemKind({ ...base, text_note: 'note' })).toBe('text_note')
  })

  it('returns "hotel_checkin" when accommodation_id set and role is checkin', () => {
    expect(itemKind({ ...base, accommodation_id: 'a1', hotel_event_role: 'checkin' })).toBe(
      'hotel_checkin'
    )
  })

  it('returns "hotel_checkout" when accommodation_id set and role is checkout', () => {
    expect(itemKind({ ...base, accommodation_id: 'a1', hotel_event_role: 'checkout' })).toBe(
      'hotel_checkout'
    )
  })
})
