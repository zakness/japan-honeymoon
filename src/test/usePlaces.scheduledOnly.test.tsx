import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePlaces } from '@/hooks/usePlaces'
import { supabase } from '@/lib/supabase'

// Supabase is globally mocked as `{}` (setup.ts). Each `from(table)` opens a
// chain proxy whose methods all return the proxy and which is thenable to a
// per-table canned response.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any

interface ChainResult {
  data?: unknown
  error?: unknown
}

function installSupabase(byTable: Record<string, ChainResult>) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const fromFn = vi.fn((table: string) => {
    const result = byTable[table] ?? { data: [], error: null }
    const proxy: Record<string, unknown> = {}
    const terminal = Promise.resolve(result)
    const chain = (method: string) =>
      vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return proxy
      })
    proxy.select = chain('select')
    proxy.eq = chain('eq')
    proxy.neq = chain('neq')
    proxy.not = chain('not')
    proxy.in = chain('in')
    proxy.is = chain('is')
    proxy.order = chain('order')
    proxy.then = (resolve: (v: ChainResult) => void) => terminal.then(resolve)
    return proxy
  })
  sb.from = fromFn
  return { fromFn, calls }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('usePlaces — scheduledOnly', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries itinerary_items first, then restricts places to scheduled ids', async () => {
    const { fromFn, calls } = installSupabase({
      itinerary_items: { data: [{ place_id: 'p1' }, { place_id: 'p2' }], error: null },
      places: { data: [{ id: 'p1' }, { id: 'p2' }], error: null },
    })

    const { result } = renderHook(() => usePlaces({ city: 'tokyo', scheduledOnly: true }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromFn).toHaveBeenCalledWith('itinerary_items')
    expect(fromFn).toHaveBeenCalledWith('places')
    const inCall = calls.find((c) => c.table === 'places' && c.method === 'in')
    expect(inCall?.args).toEqual(['id', ['p1', 'p2']])
    expect(result.current.data).toEqual([{ id: 'p1' }, { id: 'p2' }])
  })

  it('returns [] without querying places when nothing is scheduled', async () => {
    const { fromFn } = installSupabase({
      itinerary_items: { data: [], error: null },
    })

    const { result } = renderHook(() => usePlaces({ city: 'tokyo', scheduledOnly: true }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
    expect(fromFn).toHaveBeenCalledWith('itinerary_items')
    expect(fromFn).not.toHaveBeenCalledWith('places')
  })

  it('ignores scheduledOnly when dayDate is set (day filter is already scheduled-only)', async () => {
    const { fromFn } = installSupabase({
      itinerary_items: { data: [{ place: { id: 'p1' } }], error: null },
    })

    const { result } = renderHook(
      () => usePlaces({ city: 'tokyo', dayDate: '2026-05-16', scheduledOnly: true }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // dayDate path joins through itinerary_items and never touches `places`.
    expect(fromFn).toHaveBeenCalledWith('itinerary_items')
    expect(fromFn).not.toHaveBeenCalledWith('places')
    expect(result.current.data).toEqual([{ id: 'p1' }])
  })

  it('does not query itinerary_items when scheduledOnly is not set', async () => {
    const { fromFn } = installSupabase({
      places: { data: [{ id: 'p1' }], error: null },
    })

    const { result } = renderHook(() => usePlaces({ city: 'tokyo' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromFn).not.toHaveBeenCalledWith('itinerary_items')
    expect(fromFn).toHaveBeenCalledWith('places')
  })
})
