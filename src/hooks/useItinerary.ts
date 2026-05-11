import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { deleteStorageObjects } from '@/lib/storage'
import {
  applyDecidedInvariantToInsert,
  applyDecidedInvariantToUpdate,
  type ItineraryItemRow,
  type ItineraryItemInsert,
  type ItineraryItemUpdate,
  type ItineraryItemWithPlace,
} from '@/types/itinerary'
import type { Journey, SlotItemKind } from '@/types/transport'
import { TRANSPORT_KEY } from './useTransport'

export const ITINERARY_KEY = ['itinerary'] as const
const PLACES_KEY = ['places'] as const

// ---- Queries ----

export function useItineraryItems(dayDate: string) {
  return useQuery({
    queryKey: [...ITINERARY_KEY, dayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('*, place:places(*)')
        .eq('day_date', dayDate)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as ItineraryItemWithPlace[]
    },
    enabled: !!dayDate,
  })
}

export interface UnscheduledFilter {
  /** Default `'exclude'` — archived places never appear in the working set. */
  includeArchived?: 'only' | 'exclude'
  /** Only return places where priority = 'must_go'. */
  mustGoOnly?: boolean
}

export function useUnscheduledPlaces(filter?: UnscheduledFilter) {
  return useQuery({
    queryKey: [...PLACES_KEY, 'unscheduled', filter ?? null],
    queryFn: async () => {
      // Step 1: get all place IDs that are already scheduled
      const { data: scheduled, error: schedErr } = await supabase
        .from('itinerary_items')
        .select('place_id')
        .not('place_id', 'is', null)

      if (schedErr) throw schedErr

      const scheduledIds = scheduled.map((r) => r.place_id).filter(Boolean) as string[]

      // Step 2: fetch all top-level places excluding scheduled IDs. Children
      // (`parent_place_id IS NOT NULL`) ride along with their parent and are
      // never surfaced in the backlog directly.
      let query = supabase
        .from('places')
        .select('*')
        .is('parent_place_id', null)
        .order('created_at', { ascending: false })

      if (scheduledIds.length > 0) {
        query = query.not('id', 'in', `(${scheduledIds.join(',')})`)
      }

      const archivedMode = filter?.includeArchived ?? 'exclude'
      if (archivedMode === 'only') {
        query = query.eq('priority', 'archived')
      } else if (archivedMode === 'exclude') {
        query = query.neq('priority', 'archived')
      }
      if (filter?.mustGoOnly) {
        query = query.eq('priority', 'must_go')
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function usePlaceSchedule(placeId: string) {
  return useQuery({
    queryKey: [...ITINERARY_KEY, 'place', placeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('day_date')
        .eq('place_id', placeId)
      if (error) throw error
      return data.map((r) => r.day_date)
    },
    enabled: !!placeId,
  })
}

/**
 * Returns a map of placeId → scheduled day_dates for ALL scheduled places,
 * INCLUDING nested children (whose effective schedule is their parent's).
 * Children ride along with the parent — only parents have rows in
 * `itinerary_items`, but consumers asking "is THIS child scheduled?" expect
 * to see the parent's dates. Prefer this over `usePlaceSchedule` in bulk
 * contexts (map markers, place lists); use `usePlaceSchedule` only for a
 * single place where the surrounding context is just one row.
 */
export function useScheduledDatesByPlace() {
  return useQuery({
    queryKey: [...ITINERARY_KEY, 'schedule-by-place'],
    queryFn: async () => {
      const [{ data: scheduled, error: schedErr }, { data: children, error: childErr }] =
        await Promise.all([
          supabase.from('itinerary_items').select('place_id, day_date').not('place_id', 'is', null),
          supabase.from('places').select('id, parent_place_id').not('parent_place_id', 'is', null),
        ])
      if (schedErr) throw schedErr
      if (childErr) throw childErr

      const map = new Map<string, string[]>()
      for (const row of scheduled ?? []) {
        if (!row.place_id) continue
        const list = map.get(row.place_id)
        if (list) list.push(row.day_date)
        else map.set(row.place_id, [row.day_date])
      }

      // Roll up: each child inherits its parent's scheduled dates.
      for (const row of (children ?? []) as { id: string; parent_place_id: string | null }[]) {
        if (!row.parent_place_id) continue
        const parentDates = map.get(row.parent_place_id)
        if (parentDates && parentDates.length > 0) {
          map.set(row.id, [...parentDates])
        }
      }

      return map
    },
  })
}

// ---- Mutations ----

export function useCreateItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: ItineraryItemInsert) => {
      // Symmetry rule: scheduling an archived place auto-unarchives it. Check
      // and flip the priority before inserting so the place returns to the
      // working set the moment it lands on a day. Also enforces the
      // children-ride-along invariant: refuse to schedule a child place
      // directly — the UI should never offer this, but the guard catches any
      // stale code path.
      if (item.place_id) {
        const { data: existing, error: fetchErr } = await supabase
          .from('places')
          .select('priority, parent_place_id')
          .eq('id', item.place_id)
          .maybeSingle()
        if (fetchErr) throw fetchErr
        if (existing?.parent_place_id) {
          throw new Error('Cannot schedule a child place directly — schedule its parent instead')
        }
        if (existing?.priority === 'archived') {
          const { error: unarchErr } = await supabase
            .from('places')
            .update({ priority: 'default' })
            .eq('id', item.place_id)
          if (unarchErr) throw unarchErr
        }
      }

      const { data, error } = await supabase
        .from('itinerary_items')
        .insert(applyDecidedInvariantToInsert(item))
        .select('*, place:places(*)')
        .single()
      if (error) throw error
      return data as ItineraryItemWithPlace
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, created.day_date] })
      queryClient.invalidateQueries({ queryKey: [...PLACES_KEY, 'unscheduled'] })
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, 'schedule-by-place'] })
      // priority may have flipped from 'archived' to 'default' — refresh
      // every cached `usePlaces()` so the row is eligible for the working set.
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      if (created.place_id) {
        queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, 'place', created.place_id] })
      }
    },
  })
}

export function useUpdateItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: ItineraryItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .update(applyDecidedInvariantToUpdate(update))
        .eq('id', id)
        .select('*, place:places(*)')
        .single()
      if (error) throw error
      return data as ItineraryItemWithPlace
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, updated.day_date] })
      // Keep `schedule-by-place` in sync. In practice no current caller changes
      // `day_date` through this mutation (cross-day moves go through
      // `useReorderDayItemsDynamic` / `useMoveItemToDay`), but we invalidate
      // defensively so the cache stays correct if that ever changes.
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, 'schedule-by-place'] })
    },
  })
}

export function useDeleteItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dayDate }: { id: string; dayDate: string }) => {
      // Grab images before delete so we can clean up Storage. Place-backed
      // items never set `images` (photos live on `places`), so this is a
      // no-op for them.
      const { data: existing } = await supabase
        .from('itinerary_items')
        .select('images')
        .eq('id', id)
        .maybeSingle()
      const { error } = await supabase.from('itinerary_items').delete().eq('id', id)
      if (error) throw error
      const urls = Array.isArray(existing?.images) ? (existing.images as string[]) : []
      if (urls.length > 0) void deleteStorageObjects(urls)
      return { dayDate }
    },
    onSuccess: ({ dayDate }) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, 'place'] })
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, 'schedule-by-place'] })
      queryClient.invalidateQueries({ queryKey: [...PLACES_KEY, 'unscheduled'] })
    },
  })
}

export interface ReorderItem {
  id: string
  sort_order: number
  time_slot: ItineraryItemRow['time_slot']
}

export interface DayReorderItem {
  id: string
  kind: SlotItemKind
  sort_order: number
  time_slot: ItineraryItemRow['time_slot']
}

export function useReorderItineraryItems(dayDate: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      // Batch update all items' sort_order and time_slot
      const updates = items.map(({ id, sort_order, time_slot }) =>
        supabase.from('itinerary_items').update({ sort_order, time_slot }).eq('id', id)
      )
      const results = await Promise.all(updates)
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async (items) => {
      // Optimistic update: reorder the cached list immediately
      await queryClient.cancelQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      const previous = queryClient.getQueryData([...ITINERARY_KEY, dayDate])

      queryClient.setQueryData(
        [...ITINERARY_KEY, dayDate],
        (old: ItineraryItemWithPlace[] | undefined) => {
          if (!old) return old
          return old
            .map((item) => {
              const update = items.find((u) => u.id === item.id)
              return update ? { ...item, ...update } : item
            })
            .sort((a, b) => a.sort_order - b.sort_order)
        }
      )

      return { previous }
    },
    onError: (_err, _items, context) => {
      // Roll back on error
      if (context?.previous) {
        queryClient.setQueryData([...ITINERARY_KEY, dayDate], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
    },
  })
}

/** Variant of useReorderDayItems that accepts dayDate as part of the payload — for use in
 *  cross-day DnD contexts where the day isn't known at hook call time. */
export function useReorderDayItemsDynamic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ items }: { dayDate: string; items: DayReorderItem[] }) => {
      const itineraryUpdates = items
        .filter((i) => i.kind === 'itinerary')
        .map(({ id, sort_order, time_slot }) =>
          supabase.from('itinerary_items').update({ sort_order, time_slot }).eq('id', id)
        )
      const transportUpdates = items
        .filter((i) => i.kind === 'transport')
        .map(({ id, sort_order, time_slot }) =>
          supabase.from('transport_items').update({ sort_order, time_slot }).eq('id', id)
        )
      const results = await Promise.all([...itineraryUpdates, ...transportUpdates])
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async ({ dayDate, items }) => {
      await queryClient.cancelQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      await queryClient.cancelQueries({ queryKey: [...TRANSPORT_KEY, dayDate] })
      const previousItinerary = queryClient.getQueryData([...ITINERARY_KEY, dayDate])
      const previousTransport = queryClient.getQueryData([...TRANSPORT_KEY, dayDate])
      queryClient.setQueryData(
        [...ITINERARY_KEY, dayDate],
        (old: ItineraryItemWithPlace[] | undefined) => {
          if (!old) return old
          return old
            .map((item) => {
              const update = items.find((u) => u.kind === 'itinerary' && u.id === item.id)
              return update
                ? { ...item, sort_order: update.sort_order, time_slot: update.time_slot }
                : item
            })
            .sort((a, b) => a.sort_order - b.sort_order)
        }
      )
      queryClient.setQueryData([...TRANSPORT_KEY, dayDate], (old: Journey[] | undefined) => {
        if (!old) return old
        return old
          .map((j) => {
            const update = items.find((u) => u.kind === 'transport' && u.id === j.parent.id)
            return update
              ? {
                  ...j,
                  parent: {
                    ...j.parent,
                    sort_order: update.sort_order,
                    time_slot: update.time_slot,
                  },
                }
              : j
          })
          .sort((a, b) => a.parent.sort_order - b.parent.sort_order)
      })
      return { previousItinerary, previousTransport }
    },
    onError: (_err, { dayDate }, context) => {
      if (context?.previousItinerary)
        queryClient.setQueryData([...ITINERARY_KEY, dayDate], context.previousItinerary)
      if (context?.previousTransport)
        queryClient.setQueryData([...TRANSPORT_KEY, dayDate], context.previousTransport)
    },
    onSettled: (_data, _err, { dayDate }) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      queryClient.invalidateQueries({ queryKey: [...TRANSPORT_KEY, dayDate] })
    },
  })
}

export function useReorderDayItems(dayDate: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items: DayReorderItem[]) => {
      const itineraryUpdates = items
        .filter((i) => i.kind === 'itinerary')
        .map(({ id, sort_order, time_slot }) =>
          supabase.from('itinerary_items').update({ sort_order, time_slot }).eq('id', id)
        )
      const transportUpdates = items
        .filter((i) => i.kind === 'transport')
        .map(({ id, sort_order, time_slot }) =>
          supabase.from('transport_items').update({ sort_order, time_slot }).eq('id', id)
        )
      const results = await Promise.all([...itineraryUpdates, ...transportUpdates])
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      await queryClient.cancelQueries({ queryKey: [...TRANSPORT_KEY, dayDate] })

      const previousItinerary = queryClient.getQueryData([...ITINERARY_KEY, dayDate])
      const previousTransport = queryClient.getQueryData([...TRANSPORT_KEY, dayDate])

      queryClient.setQueryData(
        [...ITINERARY_KEY, dayDate],
        (old: ItineraryItemWithPlace[] | undefined) => {
          if (!old) return old
          return old
            .map((item) => {
              const update = items.find((u) => u.kind === 'itinerary' && u.id === item.id)
              return update
                ? { ...item, sort_order: update.sort_order, time_slot: update.time_slot }
                : item
            })
            .sort((a, b) => a.sort_order - b.sort_order)
        }
      )

      queryClient.setQueryData([...TRANSPORT_KEY, dayDate], (old: Journey[] | undefined) => {
        if (!old) return old
        return old
          .map((j) => {
            const update = items.find((u) => u.kind === 'transport' && u.id === j.parent.id)
            return update
              ? {
                  ...j,
                  parent: {
                    ...j.parent,
                    sort_order: update.sort_order,
                    time_slot: update.time_slot,
                  },
                }
              : j
          })
          .sort((a, b) => a.parent.sort_order - b.parent.sort_order)
      })

      return { previousItinerary, previousTransport }
    },
    onError: (_err, _items, context) => {
      if (context?.previousItinerary) {
        queryClient.setQueryData([...ITINERARY_KEY, dayDate], context.previousItinerary)
      }
      if (context?.previousTransport) {
        queryClient.setQueryData([...TRANSPORT_KEY, dayDate], context.previousTransport)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      queryClient.invalidateQueries({ queryKey: [...TRANSPORT_KEY, dayDate] })
    },
  })
}
