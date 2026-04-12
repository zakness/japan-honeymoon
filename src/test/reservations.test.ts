import { describe, it, expect } from 'vitest'
import { deriveTimeSlot, formatReservationTime } from '@/types/itinerary'

describe('deriveTimeSlot', () => {
  it('returns morning before noon', () => {
    expect(deriveTimeSlot('07:30')).toBe('morning')
    expect(deriveTimeSlot('00:00')).toBe('morning')
    expect(deriveTimeSlot('11:59')).toBe('morning')
  })

  it('returns afternoon from noon to before 17:00', () => {
    expect(deriveTimeSlot('12:00')).toBe('afternoon')
    expect(deriveTimeSlot('14:30')).toBe('afternoon')
    expect(deriveTimeSlot('16:59')).toBe('afternoon')
  })

  it('returns evening from 17:00 onward', () => {
    expect(deriveTimeSlot('17:00')).toBe('evening')
    expect(deriveTimeSlot('19:30')).toBe('evening')
    expect(deriveTimeSlot('23:59')).toBe('evening')
  })
})

describe('formatReservationTime', () => {
  it('formats AM times correctly', () => {
    expect(formatReservationTime('07:00:00')).toBe('7:00 AM')
    expect(formatReservationTime('07:00')).toBe('7:00 AM')
    expect(formatReservationTime('11:30')).toBe('11:30 AM')
  })

  it('formats noon as PM', () => {
    expect(formatReservationTime('12:00:00')).toBe('12:00 PM')
  })

  it('formats PM times correctly', () => {
    expect(formatReservationTime('19:30:00')).toBe('7:30 PM')
    expect(formatReservationTime('13:00')).toBe('1:00 PM')
  })

  it('formats midnight as 12:00 AM', () => {
    expect(formatReservationTime('00:00')).toBe('12:00 AM')
  })
})
