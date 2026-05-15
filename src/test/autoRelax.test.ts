import { describe, it, expect } from 'vitest'
import { computeAutoRelaxAction } from '@/components/itinerary/CityMap'

describe('computeAutoRelaxAction', () => {
  it('returns null when the selected place is scheduled on the active day', () => {
    expect(
      computeAutoRelaxAction({
        scheduledDates: ['2026-05-22', '2026-05-23'],
        selectedDay: '2026-05-22',
        showUnscheduled: false,
      })
    ).toBeNull()
  })

  it("returns null when the day filter is 'all' (everything scheduled is visible)", () => {
    expect(
      computeAutoRelaxAction({
        scheduledDates: ['2026-05-22'],
        selectedDay: 'all',
        showUnscheduled: false,
      })
    ).toBeNull()
  })

  it('returns reset-day when the selection is scheduled on a *different* day', () => {
    expect(
      computeAutoRelaxAction({
        scheduledDates: ['2026-05-25'],
        selectedDay: '2026-05-22',
        showUnscheduled: false,
      })
    ).toEqual({ type: 'reset-day' })
  })

  it('returns show-unscheduled when the selection is unscheduled and the overlay is off', () => {
    expect(
      computeAutoRelaxAction({
        scheduledDates: [],
        selectedDay: 'all',
        showUnscheduled: false,
      })
    ).toEqual({ type: 'show-unscheduled' })
  })

  it('returns null when unscheduled and overlay already on', () => {
    expect(
      computeAutoRelaxAction({
        scheduledDates: [],
        selectedDay: '2026-05-22',
        showUnscheduled: true,
      })
    ).toBeNull()
  })
})
