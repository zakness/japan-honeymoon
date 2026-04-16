import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useScheduledDatesByPlace } from '@/hooks/useItinerary'
import { supabase } from '@/lib/supabase'

// The supabase client is globally mocked as `{}` (setup.ts). We set up
// method chains: supabase.from().select().not() → { data, error }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any

function mockSupabaseQuery(data: Array<{ place_id: string; day_date: string }>) {
  const notFn = vi.fn().mockResolvedValue({ data, error: null })
  const selectFn = vi.fn().mockReturnValue({ not: notFn })
  const fromFn = vi.fn().mockReturnValue({ select: selectFn })
  sb.from = fromFn
  return { fromFn, selectFn, notFn }
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

  it('queries itinerary_items with place_id not null', async () => {
    const { fromFn, selectFn, notFn } = mockSupabaseQuery([])

    const { result } = renderHook(() => useScheduledDatesByPlace(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromFn).toHaveBeenCalledWith('itinerary_items')
    expect(selectFn).toHaveBeenCalledWith('place_id, day_date')
    expect(notFn).toHaveBeenCalledWith('place_id', 'is', null)
  })
})
