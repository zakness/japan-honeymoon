import { describe, it, expect } from 'vitest'
import { deriveTimeSlot, formatReservationTime } from '@/types/itinerary'

describe('deriveTimeSlot', () => {
  it('returns wake-up before 08:00', () => {
    expect(deriveTimeSlot('00:00')).toBe('wake-up')
    expect(deriveTimeSlot('07:30')).toBe('wake-up')
    expect(deriveTimeSlot('07:59')).toBe('wake-up')
  })

  it('returns breakfast from 08:00 to before 10:00', () => {
    expect(deriveTimeSlot('08:00')).toBe('breakfast')
    expect(deriveTimeSlot('09:30')).toBe('breakfast')
    expect(deriveTimeSlot('09:59')).toBe('breakfast')
  })

  it('returns morning from 10:00 to before 11:30', () => {
    expect(deriveTimeSlot('10:00')).toBe('morning')
    expect(deriveTimeSlot('10:45')).toBe('morning')
    expect(deriveTimeSlot('11:29')).toBe('morning')
  })

  it('returns lunch from 11:30 to before 14:00', () => {
    expect(deriveTimeSlot('11:30')).toBe('lunch')
    expect(deriveTimeSlot('12:00')).toBe('lunch')
    expect(deriveTimeSlot('13:59')).toBe('lunch')
  })

  it('returns afternoon from 14:00 to before 17:00', () => {
    expect(deriveTimeSlot('14:00')).toBe('afternoon')
    expect(deriveTimeSlot('15:30')).toBe('afternoon')
    expect(deriveTimeSlot('16:59')).toBe('afternoon')
  })

  it('returns dinner from 17:00 to before 20:30', () => {
    expect(deriveTimeSlot('17:00')).toBe('dinner')
    expect(deriveTimeSlot('19:30')).toBe('dinner')
    expect(deriveTimeSlot('20:29')).toBe('dinner')
  })

  it('returns evening from 20:30 onward', () => {
    expect(deriveTimeSlot('20:30')).toBe('evening')
    expect(deriveTimeSlot('22:00')).toBe('evening')
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
