import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { PlaceRow, PlaceInsert, PlacePriority, PlaceUpdate } from '@/types/places'
import type { ItineraryItemRow } from '@/types/itinerary'

export interface PlacesFilter {
  category?: PlaceRow['category']
  /** Exact-match priority filter. Prefer `mustGoOnly` for the must-go view. */
  priority?: PlaceRow['priority']
  /** Shortcut: only show places where priority = 'must_go'. */
  mustGoOnly?: boolean
  /**
   * Default is `'exclude'` — archived places never appear in the working set
   * (backlog, place list, map). Pass `'only'` to switch to the archive view.
   */
  includeArchived?: 'only' | 'exclude'
  status?: PlaceRow['status']
  city?: string
  dayDate?: string // if set, only return places assigned to this day
  /**
   * If `true` (and `dayDate` is not set), restrict results to places that have
   * at least one `itinerary_items` row — i.e. scheduled on some day. Ignored
   * when `dayDate` is set, since a day filter is already scheduled-only.
   */
  scheduledOnly?: boolean
  /**
   * Default `true` — exclude nested children (`parent_place_id IS NOT NULL`)
   * from results. Children "ride along" with their parent, so the backlog, map,
   * and place list never surface them at the top level. Pass `false` to include
   * children (e.g. when listing a single parent's children).
   */
  topLevelOnly?: boolean
}

const PLACES_KEY = ['places'] as const

// ---- Queries ----

export function usePlaces(filter?: PlacesFilter) {
  return useQuery({
    queryKey: [...PLACES_KEY, filter],
    queryFn: async () => {
      if (filter?.dayDate) {
        // Join through itinerary_items to get places for a specific day
        const { data, error } = await supabase
          .from('itinerary_items')
          .select('place:places(*)')
          .eq('day_date', filter.dayDate)
          .not('place_id', 'is', null)

        if (error) throw error

        const places = data.map((item) => item.place).filter((p): p is PlaceRow => p !== null)

        return places
      }

      // PostgREST has no subqueries: when restricting to scheduled places,
      // fetch the scheduled place IDs first and restrict the places query to
      // that set below.
      let scheduledIds: string[] | null = null
      if (filter?.scheduledOnly) {
        const { data: scheduled, error: schedErr } = await supabase
          .from('itinerary_items')
          .select('place_id')
          .not('place_id', 'is', null)
        if (schedErr) throw schedErr
        scheduledIds = scheduled.map((r) => r.place_id).filter(Boolean) as string[]
        if (scheduledIds.length === 0) return [] as PlaceRow[]
      }

      let query = supabase.from('places').select('*').order('created_at', { ascending: false })

      if (scheduledIds) query = query.in('id', scheduledIds)

      if (filter?.category) query = query.eq('category', filter.category)
      if (filter?.mustGoOnly) {
        query = query.eq('priority', 'must_go')
      } else if (filter?.priority) {
        query = query.eq('priority', filter.priority)
      }
      const archivedMode = filter?.includeArchived ?? 'exclude'
      if (archivedMode === 'only') {
        query = query.eq('priority', 'archived')
      } else if (
        archivedMode === 'exclude' &&
        !filter?.mustGoOnly &&
        filter?.priority !== 'archived'
      ) {
        query = query.neq('priority', 'archived')
      }
      if (filter?.status) query = query.eq('status', filter.status)
      if (filter?.city) query = query.eq('city', filter.city)

      const topLevelOnly = filter?.topLevelOnly ?? true
      if (topLevelOnly) query = query.is('parent_place_id', null)

      const { data, error } = await query
      if (error) throw error
      return data as PlaceRow[]
    },
  })
}

/**
 * Ordered children of a parent place. Returns `[]` when `parentId` is null
 * (used as the disabled state). Children sort by `child_sort_order` asc then
 * `created_at` asc as a stable tiebreaker.
 */
export function useChildrenOf(parentId: string | null) {
  return useQuery({
    queryKey: [...PLACES_KEY, 'children', parentId],
    queryFn: async () => {
      if (!parentId) return [] as PlaceRow[]
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('parent_place_id', parentId)
        .order('child_sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PlaceRow[]
    },
    enabled: !!parentId,
  })
}

/**
 * Bulk: parentId → number of children. One query for all parents on the page.
 */
export function useChildCounts() {
  return useQuery({
    queryKey: [...PLACES_KEY, 'child-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('places')
        .select('parent_place_id')
        .not('parent_place_id', 'is', null)
      if (error) throw error
      const map = new Map<string, number>()
      for (const row of data ?? []) {
        const pid = (row as { parent_place_id: string | null }).parent_place_id
        if (!pid) continue
        map.set(pid, (map.get(pid) ?? 0) + 1)
      }
      return map
    },
  })
}

/**
 * Bulk: parentId → whether any of its children have `priority = 'must_go'`.
 * Used by `PlaceMarker` and the backlog parent card to OR the must-go badge
 * across parent + children.
 */
export function useChildMustGoMap() {
  return useQuery({
    queryKey: [...PLACES_KEY, 'child-must-go'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('places')
        .select('parent_place_id')
        .not('parent_place_id', 'is', null)
        .eq('priority', 'must_go')
      if (error) throw error
      const set = new Set<string>()
      for (const row of data ?? []) {
        const pid = (row as { parent_place_id: string | null }).parent_place_id
        if (pid) set.add(pid)
      }
      return set
    },
  })
}

export function usePlace(id: string | null) {
  return useQuery({
    queryKey: [...PLACES_KEY, id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase.from('places').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data as PlaceRow | null
    },
    enabled: !!id,
  })
}

export function usePlaceByGoogleId(googlePlaceId: string | null) {
  return useQuery({
    queryKey: [...PLACES_KEY, 'google', googlePlaceId],
    queryFn: async () => {
      if (!googlePlaceId) return null
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .maybeSingle()
      if (error) throw error
      return data as PlaceRow | null
    },
    enabled: !!googlePlaceId,
  })
}

// ---- Mutations ----

export function useCreatePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (place: PlaceInsert) => {
      const { data, error } = await supabase.from('places').insert(place).select().single()
      if (error) throw error
      return data as PlaceRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
    },
  })
}

export function useUpdatePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: PlaceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('places')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PlaceRow
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      // Itinerary items embed a joined `place` — refetch so edits (e.g.
      // re-searching Google to pick up photos) propagate to day-column cards.
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
      queryClient.setQueryData([...PLACES_KEY, updated.id], updated)
    },
  })
}

/**
 * Toggle a place's must-go state. From `must_go` flips to `default`; from
 * `default` or `archived` flips to `must_go` (the archive carve-out: starring
 * an archived place auto-unarchives it). Optimistic — every cached places
 * query and itinerary query is patched in place, then invalidated on settle.
 */
export function useToggleMustGo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, current }: { id: string; current: PlacePriority }) => {
      const next: PlacePriority = current === 'must_go' ? 'default' : 'must_go'
      const { data, error } = await supabase
        .from('places')
        .update({ priority: next })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PlaceRow
    },
    onMutate: async ({ id, current }) => {
      await queryClient.cancelQueries({ queryKey: PLACES_KEY })
      const next: PlacePriority = current === 'must_go' ? 'default' : 'must_go'
      const snapshots = queryClient.getQueriesData<unknown>({ queryKey: PLACES_KEY })
      for (const [key, data] of snapshots) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            (data as PlaceRow[]).map((p) => (p.id === id ? { ...p, priority: next } : p))
          )
        } else if (
          data &&
          typeof data === 'object' &&
          'id' in data &&
          (data as PlaceRow).id === id
        ) {
          queryClient.setQueryData(key, { ...(data as PlaceRow), priority: next })
        }
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.snapshots) return
      for (const [key, data] of ctx.snapshots) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
    },
  })
}

export interface ArchiveResult {
  id: string
  priorPriority: PlacePriority
  removedItems: ItineraryItemRow[]
}

/**
 * Archive a place: set `priority='archived'` and remove every itinerary item
 * referencing it (the symmetry rule from the plan — archived places are out of
 * the working set, including off any day they were on). Optimistic across both
 * places and itinerary caches. Returns the prior priority + removed items so
 * `useRestoreArchivedPlace` can fully undo the operation.
 */
export function useArchivePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      priorPriority,
    }: {
      id: string
      priorPriority: PlacePriority
    }): Promise<ArchiveResult> => {
      // Guard: refuse if any child is unarchived. The UI catches this and
      // opens the `ResolveChildrenDialog`. After the dialog resolves every
      // unarchived child (archive or un-nest), this hook is called again and
      // the guard passes.
      const { data: unarchivedChildren, error: childErr } = await supabase
        .from('places')
        .select('*')
        .eq('parent_place_id', id)
        .neq('priority', 'archived')
      if (childErr) throw childErr
      if ((unarchivedChildren ?? []).length > 0) {
        throw new ArchiveBlockedByChildrenError((unarchivedChildren ?? []) as PlaceRow[])
      }

      const { data: items, error: fetchErr } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('place_id', id)
      if (fetchErr) throw fetchErr
      const removedItems = (items ?? []) as ItineraryItemRow[]

      if (removedItems.length > 0) {
        const { error: delErr } = await supabase.from('itinerary_items').delete().eq('place_id', id)
        if (delErr) throw delErr
      }

      const { error: updErr } = await supabase
        .from('places')
        .update({ priority: 'archived' })
        .eq('id', id)
      if (updErr) throw updErr

      return { id, priorPriority, removedItems }
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: PLACES_KEY })
      await queryClient.cancelQueries({ queryKey: ['itinerary'] })
      const placesSnapshots = queryClient.getQueriesData<unknown>({ queryKey: PLACES_KEY })
      for (const [key, data] of placesSnapshots) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            (data as PlaceRow[]).map((p) =>
              p.id === id ? { ...p, priority: 'archived' as PlacePriority } : p
            )
          )
        } else if (
          data &&
          typeof data === 'object' &&
          'id' in data &&
          (data as PlaceRow).id === id
        ) {
          queryClient.setQueryData(key, {
            ...(data as PlaceRow),
            priority: 'archived' as PlacePriority,
          })
        }
      }
      const itinSnapshots = queryClient.getQueriesData<unknown>({ queryKey: ['itinerary'] })
      for (const [key, data] of itinSnapshots) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            (data as { place_id?: string | null }[]).filter((item) => item.place_id !== id)
          )
        }
      }
      return { placesSnapshots, itinSnapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      for (const [key, data] of ctx.placesSnapshots) queryClient.setQueryData(key, data)
      for (const [key, data] of ctx.itinSnapshots) queryClient.setQueryData(key, data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
    },
  })
}

/**
 * Undo an archive. Re-inserts the captured itinerary items (preserving their
 * original IDs and timestamps so day-column placement is exactly as it was)
 * and restores the place's prior priority.
 */
export function useRestoreArchivedPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, priorPriority, removedItems }: ArchiveResult) => {
      if (removedItems.length > 0) {
        const { error: insErr } = await supabase.from('itinerary_items').insert(removedItems)
        if (insErr) throw insErr
      }
      const { error: updErr } = await supabase
        .from('places')
        .update({ priority: priorPriority })
        .eq('id', id)
      if (updErr) throw updErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
    },
  })
}

/**
 * Composes archive + undo toast in a single callable. Every site that wants
 * an "Archive" affordance shares this hook so the user-facing flow (toast
 * copy, undo button) is uniform — see PlaceCard, ItineraryItem, PlaceDetail.
 *
 * `onBlockedByChildren`, when provided, intercepts the typed
 * `ArchiveBlockedByChildrenError` so a caller (typically PlaceDetail) can
 * open the resolve-children dialog. Without it, the user gets a generic toast
 * pointing them at the parent's detail panel.
 */
export function useArchiveWithUndo() {
  const archive = useArchivePlace()
  const restore = useRestoreArchivedPlace()
  return useCallback(
    async (
      place: Pick<PlaceRow, 'id' | 'name' | 'priority'>,
      onBlockedByChildren?: (err: ArchiveBlockedByChildrenError) => void
    ) => {
      try {
        const result = await archive.mutateAsync({
          id: place.id,
          priorPriority: place.priority as PlacePriority,
        })
        toast.success(`Archived ${place.name}`, {
          action: {
            label: 'Undo',
            onClick: () => restore.mutate(result),
          },
        })
      } catch (err) {
        if (err instanceof ArchiveBlockedByChildrenError) {
          if (onBlockedByChildren) {
            onBlockedByChildren(err)
          } else {
            const n = err.unarchivedChildren.length
            toast.error(
              `Can't archive ${place.name}: open it to resolve the ${n} unarchived ${n === 1 ? 'place' : 'places'} added to it first.`
            )
          }
          return
        }
        toast.error('Failed to archive place')
      }
    },
    [archive, restore]
  )
}

/**
 * Manually un-archive a place. Sets `priority='default'` — we don't try to
 * remember what tier the place came from (could have been must_go or default
 * before archiving) because the user is making a fresh decision: "this is
 * back in the working set." Optimistic across cached places queries.
 */
export function useUnarchivePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('places').update({ priority: 'default' }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PLACES_KEY })
      const snapshots = queryClient.getQueriesData<unknown>({ queryKey: PLACES_KEY })
      for (const [key, data] of snapshots) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            (data as PlaceRow[]).map((p) =>
              p.id === id ? { ...p, priority: 'default' as PlacePriority } : p
            )
          )
        } else if (
          data &&
          typeof data === 'object' &&
          'id' in data &&
          (data as PlaceRow).id === id
        ) {
          queryClient.setQueryData(key, {
            ...(data as PlaceRow),
            priority: 'default' as PlacePriority,
          })
        }
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.snapshots) return
      for (const [key, data] of ctx.snapshots) queryClient.setQueryData(key, data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
    },
  })
}

/**
 * One callable that flips between archived ↔ default based on the place's
 * current priority. Powers the toggle button on backlog cards and the detail
 * panel — same icon, click reverses whichever state you're in.
 *
 * `onBlockedByChildren` forwards into `useArchiveWithUndo` so the parent's
 * detail panel can open the resolve-children dialog when a parent's archive
 * is blocked.
 */
export function useArchiveToggle() {
  const archive = useArchiveWithUndo()
  const unarchive = useUnarchivePlace()
  return useCallback(
    (
      place: Pick<PlaceRow, 'id' | 'name' | 'priority'>,
      onBlockedByChildren?: (err: ArchiveBlockedByChildrenError) => void
    ) => {
      if (place.priority === 'archived') {
        unarchive.mutate(place.id)
      } else {
        void archive(place, onBlockedByChildren)
      }
    },
    [archive, unarchive]
  )
}

/**
 * Thrown by `useArchivePlace` when the place still has unarchived children.
 * The caller (PlaceDetail / PlaceCard) catches this and opens the
 * `ResolveChildrenDialog` to ask whether to archive or un-nest each child.
 */
export class ArchiveBlockedByChildrenError extends Error {
  constructor(public unarchivedChildren: PlaceRow[]) {
    super('Cannot archive: place has unarchived children')
    this.name = 'ArchiveBlockedByChildrenError'
  }
}

/**
 * Thrown by `useDeletePlace` when the place has children. UI catches this
 * and opens the `ResolveChildrenDialog` to ask whether to delete or keep
 * each child as a standalone place.
 */
export class DeleteBlockedByChildrenError extends Error {
  constructor(public children: PlaceRow[]) {
    super('Cannot delete: place has children')
    this.name = 'DeleteBlockedByChildrenError'
  }
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Guard: refuse delete if children exist so the UI can prompt for
      // resolution. The DB has `ON DELETE SET NULL` as a safety net, but the
      // dialog gives the user explicit control (delete each child vs. keep as
      // standalone). Pass `force: true` via a separate path if ever needed.
      const { data: children, error: childErr } = await supabase
        .from('places')
        .select('*')
        .eq('parent_place_id', id)
      if (childErr) throw childErr
      if ((children ?? []).length > 0) {
        throw new DeleteBlockedByChildrenError((children ?? []) as PlaceRow[])
      }
      const { error } = await supabase.from('places').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
    },
  })
}

/** Lower-level delete that skips the children guard. Used by the resolve
 * dialog AFTER it's handed every child (delete or un-nest). */
export function useDeletePlaceRaw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('places').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
    },
  })
}

/**
 * Nest `childId` under `parentId`. Assigns `child_sort_order = max+1` so the
 * new child appears at the bottom of the parent's list. The DB trigger
 * `places_one_level_nesting` enforces the one-level invariant.
 *
 * **Symmetry rule**: nesting auto-unschedules the child. Children ride along
 * with their parent's itinerary item; leaving the child's own `itinerary_items`
 * rows in place would double-book it on those days. Returns the count of
 * removed itinerary rows so callers can surface "removed from N day(s)" in
 * their toast.
 */
export function useNestPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string }) => {
      const { data: siblings, error: sibErr } = await supabase
        .from('places')
        .select('child_sort_order')
        .eq('parent_place_id', parentId)
      if (sibErr) throw sibErr
      const max = (siblings ?? []).reduce<number>((acc, r) => {
        const v = (r as { child_sort_order: number | null }).child_sort_order
        return v != null && v > acc ? v : acc
      }, -1)

      // Auto-unschedule the child — same symmetry rule as archive. Fetch first
      // so we know how many rows we removed (for the caller's toast); skip the
      // delete when there's nothing to remove.
      const { data: existing, error: fetchErr } = await supabase
        .from('itinerary_items')
        .select('id')
        .eq('place_id', childId)
      if (fetchErr) throw fetchErr
      const removedItemCount = existing?.length ?? 0
      if (removedItemCount > 0) {
        const { error: delErr } = await supabase
          .from('itinerary_items')
          .delete()
          .eq('place_id', childId)
        if (delErr) throw delErr
      }

      const { error } = await supabase
        .from('places')
        .update({ parent_place_id: parentId, child_sort_order: max + 1 })
        .eq('id', childId)
      if (error) throw error

      return { removedItemCount }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
      // Day columns and the scheduled-dates rollup both reference the removed
      // items; refresh them so the UI loses the child immediately.
      queryClient.invalidateQueries({ queryKey: ['itinerary'] })
    },
  })
}

/** Un-nest a child: clears `parent_place_id` and `child_sort_order`. */
export function useUnnestPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from('places')
        .update({ parent_place_id: null, child_sort_order: null })
        .eq('id', childId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACES_KEY })
    },
  })
}

/** Bulk reorder children of a parent. Mirrors `useReorderDayItemsDynamic`. */
export function useReorderChildren() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      parentId,
      orderedChildIds,
    }: {
      parentId: string
      orderedChildIds: string[]
    }) => {
      const updates = orderedChildIds.map((id, idx) =>
        supabase
          .from('places')
          .update({ child_sort_order: idx })
          .eq('id', id)
          .eq('parent_place_id', parentId)
      )
      const results = await Promise.all(updates)
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async ({ parentId, orderedChildIds }) => {
      await queryClient.cancelQueries({ queryKey: [...PLACES_KEY, 'children', parentId] })
      const previous = queryClient.getQueryData([...PLACES_KEY, 'children', parentId])
      queryClient.setQueryData(
        [...PLACES_KEY, 'children', parentId],
        (old: PlaceRow[] | undefined) => {
          if (!old) return old
          const byId = new Map(old.map((c) => [c.id, c]))
          const next: PlaceRow[] = []
          for (let idx = 0; idx < orderedChildIds.length; idx++) {
            const c = byId.get(orderedChildIds[idx])
            if (c) next.push({ ...c, child_sort_order: idx })
          }
          return next
        }
      )
      return { previous, parentId }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData([...PLACES_KEY, 'children', ctx.parentId], ctx.previous)
      }
    },
    onSettled: (_data, _err, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: [...PLACES_KEY, 'children', parentId] })
    },
  })
}
