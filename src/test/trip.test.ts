import { describe, it, expect } from 'vitest'
import {
  TRIP_DAYS,
  CITY_LABELS,
  CITY_COLORS,
  getDayByDate,
  getPrimaryCityForDate,
  getCityColor,
  getHotelColor,
  type City,
} from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

function makeHotel(overrides: Partial<AccommodationRow> & { id: string }): AccommodationRow {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Test Hotel',
    city: overrides.city ?? 'tokyo',
    check_in_date: overrides.check_in_date ?? '2026-05-16',
    check_out_date: overrides.check_out_date ?? '2026-05-17',
    check_in_time: overrides.check_in_time ?? null,
    check_out_time: overrides.check_out_time ?? null,
    confirmation_numbers: overrides.confirmation_numbers ?? [],
    booking_url: overrides.booking_url ?? null,
    address: overrides.address ?? null,
    lat: overrides.lat ?? null,
    lng: overrides.lng ?? null,
    website: overrides.website ?? null,
    booked_by: overrides.booked_by ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  }
}

describe('TRIP_DAYS', () => {
  it('has exactly 15 days', () => {
    expect(TRIP_DAYS).toHaveLength(15)
  })

  it('starts on May 16 2026', () => {
    expect(TRIP_DAYS[0].date).toBe('2026-05-16')
  })

  it('ends on May 30 2026', () => {
    expect(TRIP_DAYS[14].date).toBe('2026-05-30')
  })

  it('has sequential day numbers 1–15', () => {
    TRIP_DAYS.forEach((day, i) => {
      expect(day.dayNumber).toBe(i + 1)
    })
  })

  it('has no duplicate dates', () => {
    const dates = TRIP_DAYS.map((d) => d.date)
    expect(new Set(dates).size).toBe(dates.length)
  })

  it('assigns every day at least one city', () => {
    TRIP_DAYS.forEach((day) => {
      expect(day.cities.length).toBeGreaterThan(0)
    })
  })
})

describe('city assignments', () => {
  it('marks Tokyo days correctly', () => {
    const tokyoDays = TRIP_DAYS.filter((d) => d.cities.includes('tokyo'))
    // May 16–22 are all Tokyo days (some also have a second city)
    expect(tokyoDays.length).toBe(7)
  })

  it('marks Hakone days correctly', () => {
    const hakoneDays = TRIP_DAYS.filter((d) => d.cities.includes('hakone'))
    expect(hakoneDays.length).toBe(3) // May 22 (transit in), 23 (full day), 24 (transit out)
  })

  it('marks Kyoto days correctly', () => {
    const kyotoDays = TRIP_DAYS.filter((d) => d.cities.includes('kyoto'))
    expect(kyotoDays.length).toBe(4) // May 24, 25, 26, 27
  })

  it('marks Naoshima days correctly', () => {
    const naoshimaDays = TRIP_DAYS.filter((d) => d.cities.includes('naoshima'))
    expect(naoshimaDays.length).toBe(3) // May 27, 28, 29
  })

  it('marks Osaka days correctly', () => {
    const osakaDays = TRIP_DAYS.filter((d) => d.cities.includes('osaka'))
    expect(osakaDays.length).toBe(2) // May 29, 30
  })
})

describe('transit days', () => {
  it('marks travel days as transit', () => {
    const transitDates = ['2026-05-22', '2026-05-24', '2026-05-27', '2026-05-29', '2026-05-30']
    transitDates.forEach((date) => {
      const day = getDayByDate(date)
      expect(day?.isTransit).toBe(true)
    })
  })

  it('marks non-travel days as not transit', () => {
    const nonTransitDates = ['2026-05-16', '2026-05-19', '2026-05-23', '2026-05-25', '2026-05-28']
    nonTransitDates.forEach((date) => {
      const day = getDayByDate(date)
      expect(day?.isTransit).toBe(false)
    })
  })
})

describe('getDayByDate', () => {
  it('returns the correct day for a valid date', () => {
    const day = getDayByDate('2026-05-17')
    expect(day).toBeDefined()
    expect(day?.dayNumber).toBe(2)
    expect(day?.cities).toContain('tokyo')
  })

  it('returns undefined for a date outside the trip', () => {
    expect(getDayByDate('2026-06-01')).toBeUndefined()
    expect(getDayByDate('2026-05-15')).toBeUndefined()
    expect(getDayByDate('')).toBeUndefined()
  })
})

describe('getPrimaryCityForDate', () => {
  it('returns the destination city for transit days', () => {
    // May 22: tokyo → hakone, primary should be hakone (last in array)
    expect(getPrimaryCityForDate('2026-05-22')).toBe('hakone')
    // May 24: hakone → kyoto
    expect(getPrimaryCityForDate('2026-05-24')).toBe('kyoto')
    // May 27: kyoto → naoshima
    expect(getPrimaryCityForDate('2026-05-27')).toBe('naoshima')
  })

  it('returns the city for single-city days', () => {
    expect(getPrimaryCityForDate('2026-05-16')).toBe('tokyo')
    expect(getPrimaryCityForDate('2026-05-23')).toBe('hakone')
    expect(getPrimaryCityForDate('2026-05-28')).toBe('naoshima')
  })

  it('returns undefined for dates outside the trip', () => {
    expect(getPrimaryCityForDate('2025-01-01')).toBeUndefined()
  })
})

describe('CITY_LABELS', () => {
  it('has a label for every city', () => {
    const cities: City[] = ['tokyo', 'hakone', 'kyoto', 'naoshima', 'osaka']
    cities.forEach((city) => {
      expect(CITY_LABELS[city]).toBeTruthy()
    })
  })
})

describe('CITY_COLORS', () => {
  it('has a primary and tint for every city', () => {
    const cities: City[] = ['tokyo', 'hakone', 'kyoto', 'naoshima', 'osaka']
    cities.forEach((city) => {
      expect(CITY_COLORS[city].primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(CITY_COLORS[city].tint).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  it('defines variants for Tokyo (two hotels)', () => {
    expect(CITY_COLORS.tokyo.variants).toBeDefined()
    expect(CITY_COLORS.tokyo.variants).toHaveLength(2)
  })
})

describe('getCityColor', () => {
  it('returns the primary and tint for a city (never a variant)', () => {
    expect(getCityColor('tokyo')).toEqual({ primary: '#7c3aed', tint: '#ede9fe' })
    expect(getCityColor('hakone')).toEqual({ primary: '#0891b2', tint: '#cffafe' })
    expect(getCityColor('kyoto')).toEqual({ primary: '#be123c', tint: '#ffe4e6' })
    expect(getCityColor('naoshima')).toEqual({ primary: '#ca8a04', tint: '#fef3c7' })
    expect(getCityColor('osaka')).toEqual({ primary: '#ea580c', tint: '#ffedd5' })
  })
})

describe('getHotelColor', () => {
  it('returns the city primary for a single-hotel city', () => {
    const hotel = makeHotel({ id: 'h1', city: 'kyoto', check_in_date: '2026-05-24' })
    expect(getHotelColor(hotel, [hotel])).toEqual({ primary: '#be123c', tint: '#ffe4e6' })
  })

  it('assigns Tokyo variants by check_in_date order', () => {
    const first = makeHotel({ id: 'h1', city: 'tokyo', check_in_date: '2026-05-16' })
    const second = makeHotel({ id: 'h2', city: 'tokyo', check_in_date: '2026-05-19' })
    const allHotels = [second, first] // deliberately reversed to prove sort, not input order

    // First Tokyo hotel (by date) → variants[0] = violet
    expect(getHotelColor(first, allHotels)).toEqual({ primary: '#7c3aed', tint: '#ede9fe' })
    // Second Tokyo hotel (by date) → variants[1] = rose
    expect(getHotelColor(second, allHotels)).toEqual({ primary: '#db2777', tint: '#fce7f3' })
  })

  it('ignores hotels in other cities when resolving variant index', () => {
    const tokyoHotel = makeHotel({ id: 'tok', city: 'tokyo', check_in_date: '2026-05-19' })
    const kyotoHotel = makeHotel({ id: 'kyo', city: 'kyoto', check_in_date: '2026-05-16' })
    // Tokyo has only one hotel — should get variants[0] (primary violet), not variants[1]
    expect(getHotelColor(tokyoHotel, [kyotoHotel, tokyoHotel])).toEqual({
      primary: '#7c3aed',
      tint: '#ede9fe',
    })
  })

  it('falls back to neutral gray for hotels with unknown city', () => {
    const hotel = makeHotel({ id: 'h1', city: 'nowhere' })
    expect(getHotelColor(hotel, [hotel])).toEqual({ primary: '#6b7280', tint: '#f3f4f6' })
  })
})
