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

      let query = supabase.from('places').select('*').order('created_at', { ascending: false })

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

      const { data, error } = await query
      if (error) throw error
      return data as PlaceRow[]
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
 */
export function useArchiveWithUndo() {
  const archive = useArchivePlace()
  const restore = useRestoreArchivedPlace()
  return useCallback(
    async (place: Pick<PlaceRow, 'id' | 'name' | 'priority'>) => {
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
      } catch {
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
 */
export function useArchiveToggle() {
  const archive = useArchiveWithUndo()
  const unarchive = useUnarchivePlace()
  return useCallback(
    (place: Pick<PlaceRow, 'id' | 'name' | 'priority'>) => {
      if (place.priority === 'archived') {
        unarchive.mutate(place.id)
      } else {
        void archive(place)
      }
    },
    [archive, unarchive]
  )
}

export function useDeletePlace() {
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
