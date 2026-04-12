import { describe, it, expect } from 'vitest'
import {
  TRIP_DAYS,
  CITY_LABELS,
  getDayByDate,
  getPrimaryCityForDate,
  type City,
} from '@/config/trip'

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
