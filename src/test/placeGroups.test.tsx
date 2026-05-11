import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  ArchiveBlockedByChildrenError,
  DeleteBlockedByChildrenError,
  useArchivePlace,
  useChildMustGoMap,
  useChildCounts,
  useDeletePlace,
  useDeletePlaceRaw,
  useNestPlace,
  useReorderChildren,
  useUnnestPlace,
} from '@/hooks/usePlaces'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any

interface ChainResult {
  data?: unknown
  error?: unknown
}

/**
 * Per-table chain mock. Each `from(table)` call increments a counter so a
 * table can serve a *sequence* of results across multiple `from(table)`
 * invocations within a single hook (e.g. archive: SELECT children, then
 * SELECT items, then UPDATE place). Pass `placesSequence` for ordered
 * responses on `places`; pass a single `places` object for a constant result.
 */
function installSupabase({
  byTable = {},
  placesSequence,
}: {
  byTable?: Record<string, ChainResult>
  placesSequence?: ChainResult[]
}) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  let placesIndex = 0
  const fromFn = vi.fn((table: string) => {
    let result: ChainResult
    if (table === 'places' && placesSequence) {
      result = placesSequence[Math.min(placesIndex, placesSequence.length - 1)] ?? {
        data: null,
        error: null,
      }
      placesIndex++
    } else {
      result = byTable[table] ?? { data: null, error: null }
    }
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
    proxy.is = chain('is')
    proxy.in = chain('in')
    proxy.order = chain('order')
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

describe('useNestPlace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('assigns max(child_sort_order)+1 and writes parent_place_id', async () => {
    const { calls } = installSupabase({
      placesSequence: [
        // SELECT siblings to compute max
        { data: [{ child_sort_order: 2 }, { child_sort_order: 5 }], error: null },
        // UPDATE places (nest)
        { error: null },
      ],
      byTable: {
        // No itinerary items for this child → no delete issued
        itinerary_items: { data: [], error: null },
      },
    })
    const { result } = renderHook(() => useNestPlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ childId: 'c1', parentId: 'p1' })
    })
    const update = calls.find((c) => c.table === 'places' && c.method === 'update')
    expect(update?.args[0]).toEqual({ parent_place_id: 'p1', child_sort_order: 6 })
  })

  it('uses 0 as the first child_sort_order when parent has no children yet', async () => {
    const { calls } = installSupabase({
      placesSequence: [
        { data: [], error: null }, // no siblings
        { error: null }, // update
      ],
      byTable: {
        itinerary_items: { data: [], error: null },
      },
    })
    const { result } = renderHook(() => useNestPlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ childId: 'c1', parentId: 'p1' })
    })
    const update = calls.find((c) => c.table === 'places' && c.method === 'update')
    expect(update?.args[0]).toEqual({ parent_place_id: 'p1', child_sort_order: 0 })
  })

  it('auto-unschedules: deletes existing itinerary_items for the child', async () => {
    const { calls } = installSupabase({
      placesSequence: [
        { data: [], error: null }, // no siblings
        { error: null }, // update
      ],
      byTable: {
        // Two scheduled rows for the child → delete should be issued
        itinerary_items: { data: [{ id: 'i1' }, { id: 'i2' }], error: null },
      },
    })
    const { result } = renderHook(() => useNestPlace(), { wrapper })
    let returned: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({ childId: 'c1', parentId: 'p1' })
    })
    // Delete on itinerary_items was issued
    const itemsDelete = calls.find((c) => c.table === 'itinerary_items' && c.method === 'delete')
    expect(itemsDelete).toBeDefined()
    // Hook surfaces the removed count
    expect(returned?.removedItemCount).toBe(2)
  })

  it('skips the delete when the child has no scheduled items', async () => {
    const { calls } = installSupabase({
      placesSequence: [{ data: [], error: null }, { error: null }],
      byTable: {
        itinerary_items: { data: [], error: null },
      },
    })
    const { result } = renderHook(() => useNestPlace(), { wrapper })
    let returned: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({ childId: 'c1', parentId: 'p1' })
    })
    const itemsDelete = calls.find((c) => c.table === 'itinerary_items' && c.method === 'delete')
    expect(itemsDelete).toBeUndefined()
    expect(returned?.removedItemCount).toBe(0)
  })
})

describe('useUnnestPlace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears parent_place_id and child_sort_order', async () => {
    const { calls } = installSupabase({ byTable: { places: { error: null } } })
    const { result } = renderHook(() => useUnnestPlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('c1')
    })
    const update = calls.find((c) => c.method === 'update')
    expect(update?.args[0]).toEqual({ parent_place_id: null, child_sort_order: null })
  })
})

describe('useReorderChildren', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes child_sort_order = index for each child in order', async () => {
    const { calls } = installSupabase({ byTable: { places: { error: null } } })
    const { result } = renderHook(() => useReorderChildren(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        parentId: 'p1',
        orderedChildIds: ['c2', 'c0', 'c1'],
      })
    })
    const updates = calls.filter((c) => c.method === 'update')
    expect(updates).toHaveLength(3)
    expect(updates[0].args[0]).toEqual({ child_sort_order: 0 })
    expect(updates[1].args[0]).toEqual({ child_sort_order: 1 })
    expect(updates[2].args[0]).toEqual({ child_sort_order: 2 })
  })
})

describe('useArchivePlace — children guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws ArchiveBlockedByChildrenError when any child is unarchived', async () => {
    installSupabase({
      placesSequence: [
        // SELECT children check returns one unarchived child
        {
          data: [{ id: 'c1', name: 'Child One', priority: 'default', parent_place_id: 'p1' }],
          error: null,
        },
      ],
    })
    const { result } = renderHook(() => useArchivePlace(), { wrapper })
    let caught: unknown
    await act(async () => {
      try {
        await result.current.mutateAsync({ id: 'p1', priorPriority: 'default' })
      } catch (err) {
        caught = err
      }
    })
    expect(caught).toBeInstanceOf(ArchiveBlockedByChildrenError)
    expect((caught as ArchiveBlockedByChildrenError).unarchivedChildren).toHaveLength(1)
    expect((caught as ArchiveBlockedByChildrenError).unarchivedChildren[0].id).toBe('c1')
  })

  it('proceeds with archive when no unarchived children exist', async () => {
    const { calls } = installSupabase({
      placesSequence: [
        { data: [], error: null }, // children check → empty
        { error: null }, // update places
      ],
      byTable: {
        itinerary_items: { data: [], error: null },
      },
    })
    const { result } = renderHook(() => useArchivePlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', priorPriority: 'default' })
    })
    const placesUpdate = calls.find((c) => c.table === 'places' && c.method === 'update')
    expect(placesUpdate?.args[0]).toEqual({ priority: 'archived' })
  })
})

describe('useDeletePlace — children guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws DeleteBlockedByChildrenError when children exist', async () => {
    installSupabase({
      placesSequence: [
        // SELECT children returns one row
        { data: [{ id: 'c1', name: 'Child', priority: 'default' }], error: null },
      ],
    })
    const { result } = renderHook(() => useDeletePlace(), { wrapper })
    let caught: unknown
    await act(async () => {
      try {
        await result.current.mutateAsync('p1')
      } catch (err) {
        caught = err
      }
    })
    expect(caught).toBeInstanceOf(DeleteBlockedByChildrenError)
    expect((caught as DeleteBlockedByChildrenError).children).toHaveLength(1)
  })

  it('proceeds with delete when no children exist', async () => {
    const { calls } = installSupabase({
      placesSequence: [
        { data: [], error: null }, // children check
        { error: null }, // delete
      ],
    })
    const { result } = renderHook(() => useDeletePlace(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('p1')
    })
    expect(calls.some((c) => c.table === 'places' && c.method === 'delete')).toBe(true)
  })
})

describe('useDeletePlaceRaw', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips the children guard and deletes directly', async () => {
    const { calls } = installSupabase({ byTable: { places: { error: null } } })
    const { result } = renderHook(() => useDeletePlaceRaw(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('p1')
    })
    expect(calls.some((c) => c.method === 'delete')).toBe(true)
    // Raw delete does NOT issue a SELECT first
    expect(calls.some((c) => c.method === 'select')).toBe(false)
  })
})

describe('useChildCounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates per-parent row counts', async () => {
    installSupabase({
      byTable: {
        places: {
          data: [
            { parent_place_id: 'p1' },
            { parent_place_id: 'p1' },
            { parent_place_id: 'p1' },
            { parent_place_id: 'p2' },
          ],
          error: null,
        },
      },
    })
    const { result } = renderHook(() => useChildCounts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.get('p1')).toBe(3)
    expect(result.current.data?.get('p2')).toBe(1)
    expect(result.current.data?.has('p3')).toBe(false)
  })
})

describe('useChildMustGoMap', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds a Set of parent ids whose any child is must_go', async () => {
    installSupabase({
      byTable: {
        places: {
          data: [{ parent_place_id: 'p1' }, { parent_place_id: 'p3' }],
          error: null,
        },
      },
    })
    const { result } = renderHook(() => useChildMustGoMap(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.has('p1')).toBe(true)
    expect(result.current.data?.has('p3')).toBe(true)
    expect(result.current.data?.has('p2')).toBe(false)
  })
})
