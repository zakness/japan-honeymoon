import { describe, it, expect } from 'vitest'
import { hotelCoversDay } from '@/types/accommodations'

describe('hotelCoversDay', () => {
  const stay = { check_in_date: '2026-05-16', check_out_date: '2026-05-19' }

  it('covers the check-in date (arrival day)', () => {
    expect(hotelCoversDay(stay, '2026-05-16')).toBe(true)
  })

  it('covers the check-out date (there is a check-out itinerary event that day)', () => {
    expect(hotelCoversDay(stay, '2026-05-19')).toBe(true)
  })

  it('covers any day in the middle of the stay', () => {
    expect(hotelCoversDay(stay, '2026-05-17')).toBe(true)
    expect(hotelCoversDay(stay, '2026-05-18')).toBe(true)
  })

  it('does not cover the day before check-in', () => {
    expect(hotelCoversDay(stay, '2026-05-15')).toBe(false)
  })

  it('does not cover the day after check-out', () => {
    expect(hotelCoversDay(stay, '2026-05-20')).toBe(false)
  })
})
