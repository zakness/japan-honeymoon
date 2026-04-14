import { describe, it, expect } from 'vitest'
import { applyDecidedInvariantToInsert, applyDecidedInvariantToUpdate } from '@/types/itinerary'

describe('applyDecidedInvariantToInsert', () => {
  const base = { day_date: '2026-05-20', sort_order: 0 } as const

  it('forces is_decided=true when reservation_time is set', () => {
    const result = applyDecidedInvariantToInsert({
      ...base,
      reservation_time: '19:00',
      is_decided: false,
    })
    expect(result.is_decided).toBe(true)
    expect(result.reservation_time).toBe('19:00')
  })

  it('forces is_decided=true even when caller omits it', () => {
    const result = applyDecidedInvariantToInsert({
      ...base,
      reservation_time: '12:30',
    })
    expect(result.is_decided).toBe(true)
  })

  it('leaves the payload untouched when no reservation_time is set', () => {
    const input = { ...base, text_note: 'maybe temple' }
    const result = applyDecidedInvariantToInsert(input)
    expect(result).toBe(input)
    expect(result.is_decided).toBeUndefined()
  })

  it('preserves an explicit is_decided=true when no reservation is set', () => {
    const result = applyDecidedInvariantToInsert({ ...base, is_decided: true })
    expect(result.is_decided).toBe(true)
  })

  it('leaves is_decided=false when reservation_time is null', () => {
    const result = applyDecidedInvariantToInsert({
      ...base,
      reservation_time: null,
      is_decided: false,
    })
    expect(result.is_decided).toBe(false)
  })
})

describe('applyDecidedInvariantToUpdate', () => {
  it('forces is_decided=true when setting a reservation_time', () => {
    const result = applyDecidedInvariantToUpdate({ reservation_time: '18:00' })
    expect(result.is_decided).toBe(true)
  })

  it('does NOT flip is_decided back when clearing a reservation', () => {
    // A user may have locked in without a specific time — clearing the
    // reservation_time shouldn't demote the item back to speculative.
    const input = { reservation_time: null }
    const result = applyDecidedInvariantToUpdate(input)
    expect(result).toBe(input)
    expect(result.is_decided).toBeUndefined()
  })

  it('passes through unrelated updates unchanged', () => {
    const input = { time_slot: 'evening' as const }
    const result = applyDecidedInvariantToUpdate(input)
    expect(result).toBe(input)
  })

  it('allows explicit is_decided=false toggle when no reservation is touched', () => {
    const result = applyDecidedInvariantToUpdate({ is_decided: false })
    expect(result.is_decided).toBe(false)
  })
})
