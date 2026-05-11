import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useScheduledDatesByPlace } from '@/hooks/useItinerary'
import { supabase } from '@/lib/supabase'

// The supabase client is globally mocked as `{}` (setup.ts). We set up
// method chains: supabase.from().select().not() → { data, error }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any

/**
 * The hook now runs two parallel queries:
 *   itinerary_items.select(place_id, day_date).not(place_id, 'is', null)
 *   places.select(id, parent_place_id).not(parent_place_id, 'is', null)
 * Each `from(table)` call resolves to a per-table canned response.
 */
function mockSupabaseQuery(
  items: Array<{ place_id: string; day_date: string }>,
  children: Array<{ id: string; parent_place_id: string }> = []
) {
  const fromFn = vi.fn((table: string) => {
    const data = table === 'places' ? children : items
    const notFn = vi.fn().mockResolvedValue({ data, error: null })
    const selectFn = vi.fn().mockReturnValue({ not: notFn })
    return { select: selectFn }
  })
  sb.from = fromFn
  return { fromFn }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useScheduledDatesByPlace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty Map when no items are scheduled', async () => {
    mockSupabaseQuery([])

    const { result } = renderHook(() => useScheduledDatesByPlace(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeInstanceOf(Map)
    expect(result.current.data!.size).toBe(0)
  })

  it('groups dates by place_id', async () => {
    mockSupabaseQuery([
      { place_id: 'p1', day_date: '2026-05-15' },
      { place_id: 'p1', day_date: '2026-05-16' },
      { place_id: 'p2', day_date: '2026-05-17' },
    ])

    const { result } = renderHook(() => useScheduledDatesByPlace(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const map = result.current.data!
    expect(map.get('p1')).toEqual(['2026-05-15', '2026-05-16'])
    expect(map.get('p2')).toEqual(['2026-05-17'])
    expect(map.has('p3')).toBe(false)
  })

  it('queries itinerary_items and places in parallel', async () => {
    const { fromFn } = mockSupabaseQuery([])

    const { result } = renderHook(() => useScheduledDatesByPlace(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromFn).toHaveBeenCalledWith('itinerary_items')
    expect(fromFn).toHaveBeenCalledWith('places')
  })

  it('rolls up parent scheduled dates onto child place ids', async () => {
    mockSupabaseQuery(
      [
        { place_id: 'parent1', day_date: '2026-05-15' },
        { place_id: 'parent1', day_date: '2026-05-16' },
      ],
      [
        { id: 'child1', parent_place_id: 'parent1' },
        { id: 'child2', parent_place_id: 'parent1' },
      ]
    )

    const { result } = renderHook(() => useScheduledDatesByPlace(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const map = result.current.data!
    expect(map.get('parent1')).toEqual(['2026-05-15', '2026-05-16'])
    // Children inherit the parent's scheduled dates so "is this child scheduled?"
    // returns the right answer in bulk consumers.
    expect(map.get('child1')).toEqual(['2026-05-15', '2026-05-16'])
    expect(map.get('child2')).toEqual(['2026-05-15', '2026-05-16'])
  })

  it('does not assign scheduled dates to children of unscheduled parents', async () => {
    mockSupabaseQuery(
      // parent1 is unscheduled — no itinerary rows for it
      [{ place_id: 'somethingElse', day_date: '2026-05-15' }],
      [{ id: 'child1', parent_place_id: 'parent1' }]
    )

    const { result } = renderHook(() => useScheduledDatesByPlace(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.has('child1')).toBe(false)
  })
})
