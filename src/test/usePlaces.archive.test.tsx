import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useArchivePlace,
  useArchiveToggle,
  useToggleMustGo,
  useUnarchivePlace,
} from '@/hooks/usePlaces'
import { supabase } from '@/lib/supabase'

// Supabase is globally mocked as `{}` (setup.ts). Each test installs a
// `from()` chain that captures the calls we care about and returns canned
// responses. Mutation hooks under test all hit `places` and sometimes
// `itinerary_items` — we treat each `from(table)` invocation as opening a
// new chain so different operations don't bleed into one another.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any

interface ChainResult {
  data?: unknown
  error?: unknown
}

/**
 * Builds a shared `from()` mock where each table can serve different terminal
 * operations. Every chain method returns the same proxy object so any order
 * of `.select().eq().single()` / `.update().eq()` / `.delete().eq()` resolves
 * to the canned `result`. Limitations: doesn't differentiate operations on
 * the same table (good enough for our hooks — each hook touches each table
 * at most once per mutation).
 */
function installSupabase(byTable: Record<string, ChainResult>) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const fromFn = vi.fn((table: string) => {
    const result = byTable[table] ?? { data: null, error: null }
    const proxy: Record<string, unknown> = {}
    const terminal = Promise.resolve(result)
    const chain = (method: string) =>
      vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return proxy
      })
    proxy.select = chain('select')
    proxy.insert = chain('insert')
    proxy.update = chain('update')
    proxy.delete = chain('delete')
    proxy.eq = chain('eq')
    proxy.neq = chain('neq')
    proxy.not = chain('not')
    proxy.in = chain('in')
    proxy.order = chain('order')
    // Terminal methods return the canned result. Single chain gives `single`
    // and `maybeSingle` the same shape; raw thenable handles `.then` too.
    proxy.single = vi.fn(() => terminal)
    proxy.maybeSingle = vi.fn(() => terminal)
    proxy.then = (resolve: (v: ChainResult) => void) => terminal.then(resolve)
    return proxy
  })
  sb.from = fromFn
  return { fromFn, calls }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useToggleMustGo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flips must_go → default', async () => {
    const { calls } = installSupabase({
      places: { data: { id: 'p1', priority: 'default' }, error: null },
    })
    const { result } = renderHook(() => useToggleMustGo(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', current: 'must_go' })
    })
    const update = calls.find((c) => c.method === 'update')
    expect(update?.args[0]).toEqual({ priority: 'default' })
  })

  it('flips default → must_go', async () => {
    const { calls } = installSupabase({
      places: { data: { id: 'p1', priority: 'must_go' }, error: null },
    })
    const { result } = renderHook(() => useToggleMustGo(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', current: 'default' })
    })
    const update = calls.find((c) => c.method === 'update')
    expect(update?.args[0]).toEqual({ priority: 'must_go' })
  })

  it('archived → must_go (carve-out: starring auto-unarchives)', async () => {
    const { calls } = installSupabase({
      places: { data: { id: 'p1', priority: 'must_go' }, error: null },
    })
    const { result } = renderHook(() => useToggleMustGo(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', current: 'archived' })
    })
    const update = calls.find((c) => c.method === 'update')
    expect(update?.args[0]).toEqual({ priority: 'must_go' })
  })
})

describe('useArchivePlace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('archives the place and returns prior priority + removed items', async () => {
    const items = [
      { id: 'i1', place_id: 'p1', day_date: '2026-05-16', sort_order: 0 },
      { id: 'i2', place_id: 'p1', day_date: '2026-05-17', sort_order: 1 },
    ]
    installSupabase({
      itinerary_items: { data: items, error: null },
      places: { error: null },
    })
    const { result } = renderHook(() => useArchivePlace(), { wrapper })

    let archiveResult: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
    await act(async () => {
      archiveResult = await result.current.mutateAsync({ id: 'p1', priorPriority: 'must_go' })
    })

    expect(archiveResult).toBeDefined()
    expect(archiveResult!.id).toBe('p1')
    expect(archiveResult!.priorPriority).toBe('must_go')
    expect(archiveResult!.removedItems).toHaveLength(2)
    expect(archiveResult!.removedItems[0].id).toBe('i1')
  })

  it('writes priority=archived and deletes itinerary_items rows', async () => {
    const { calls } = installSupabase({
      itinerary_items: { data: [{ id: 'i1', place_id: 'p1' }], error: null },
      places: { error: null },
    })
    const { result } = renderHook(() => useArchivePlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', priorPriority: 'default' })
    })

    // Update on places with priority='archived'
    const placesUpdate = calls.find((c) => c.table === 'places' && c.method === 'update')
    expect(placesUpdate?.args[0]).toEqual({ priority: 'archived' })

    // Delete on itinerary_items (auto-unschedule symmetry)
    const itemsDelete = calls.find((c) => c.table === 'itinerary_items' && c.method === 'delete')
    expect(itemsDelete).toBeDefined()
  })

  it('skips the delete when there are no scheduled items', async () => {
    const { calls } = installSupabase({
      itinerary_items: { data: [], error: null },
      places: { error: null },
    })
    const { result } = renderHook(() => useArchivePlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', priorPriority: 'default' })
    })
    const itemsDelete = calls.find((c) => c.table === 'itinerary_items' && c.method === 'delete')
    expect(itemsDelete).toBeUndefined()
  })
})

describe('useUnarchivePlace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes priority=default for the given place id', async () => {
    const { calls } = installSupabase({ places: { error: null } })
    const { result } = renderHook(() => useUnarchivePlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('p1')
    })
    const placesUpdate = calls.find((c) => c.table === 'places' && c.method === 'update')
    expect(placesUpdate?.args[0]).toEqual({ priority: 'default' })
    const eqCall = calls.find((c) => c.table === 'places' && c.method === 'eq')
    expect(eqCall?.args).toEqual(['id', 'p1'])
  })
})

describe('useArchiveToggle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes archived places through unarchive (priority=default)', async () => {
    const { calls } = installSupabase({ places: { error: null } })
    const { result } = renderHook(() => useArchiveToggle(), { wrapper })
    await act(async () => {
      result.current({ id: 'p1', name: 'Test', priority: 'archived' })
    })
    await waitFor(() => {
      const update = calls.find((c) => c.table === 'places' && c.method === 'update')
      expect(update?.args[0]).toEqual({ priority: 'default' })
    })
    // The archive path also touches itinerary_items; the unarchive path
    // should not.
    expect(calls.find((c) => c.table === 'itinerary_items')).toBeUndefined()
  })

  it('routes non-archived places through archive (priority=archived)', async () => {
    const { calls } = installSupabase({
      itinerary_items: { data: [], error: null },
      places: { error: null },
    })
    const { result } = renderHook(() => useArchiveToggle(), { wrapper })
    await act(async () => {
      result.current({ id: 'p1', name: 'Test', priority: 'must_go' })
    })
    await waitFor(() => {
      const update = calls.find((c) => c.table === 'places' && c.method === 'update')
      expect(update?.args[0]).toEqual({ priority: 'archived' })
    })
  })
})
