import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Journey,
  TransportItemInsert,
  TransportItemRow,
  TransportItemUpdate,
  TransportLegInsert,
  TransportLegRow,
  TransportLegUpdate,
} from '@/types/transport'

export const TRANSPORT_KEY = ['transport'] as const

type RawJourneyRow = TransportItemRow & { transport_legs: TransportLegRow[] | null }

function normalizeJourney(row: RawJourneyRow): Journey {
  const { transport_legs, ...parent } = row
  const legs = [...(transport_legs ?? [])].sort((a, b) => a.leg_index - b.leg_index)
  return { parent, legs }
}

// ---- Queries ----

export function useAllJourneys() {
  return useQuery({
    queryKey: TRANSPORT_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_items')
        .select('*, transport_legs(*)')
        .order('day_date', { ascending: true })
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data as RawJourneyRow[]).map(normalizeJourney)
    },
    staleTime: Infinity,
  })
}

export function useJourneysForDay(dayDate: string) {
  return useQuery({
    queryKey: [...TRANSPORT_KEY, dayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_items')
        .select('*, transport_legs(*)')
        .eq('day_date', dayDate)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data as RawJourneyRow[]).map(normalizeJourney)
    },
    enabled: !!dayDate,
  })
}

// ---- Mutations ----

// Shape used by the edit dialog when authoring or mutating legs.
// `id` absent → insert; `id` present and matching an existing leg → update; listed in
// `legIdsToDelete` → delete. leg_index is authoritative on save.
export type LegDraft = Omit<TransportLegInsert, 'transport_id' | 'leg_index'> & {
  id?: string
}

export function useCreateJourney() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      parent,
      legs,
    }: {
      parent: TransportItemInsert
      legs: LegDraft[]
    }): Promise<Journey> => {
      const { data: parentRow, error: parentErr } = await supabase
        .from('transport_items')
        .insert(parent)
        .select('*')
        .single()
      if (parentErr) throw parentErr

      const legRows: TransportLegInsert[] = legs.map((leg, index) => {
        const { id: _draftId, ...rest } = leg
        return { ...rest, transport_id: parentRow.id, leg_index: index }
      })

      if (legRows.length === 0) {
        return { parent: parentRow as TransportItemRow, legs: [] }
      }

      const { data: insertedLegs, error: legErr } = await supabase
        .from('transport_legs')
        .insert(legRows)
        .select('*')
      if (legErr) {
        // cleanup parent so we don't leave a legless journey
        await supabase.from('transport_items').delete().eq('id', parentRow.id)
        throw legErr
      }

      const sorted = [...(insertedLegs as TransportLegRow[])].sort(
        (a, b) => a.leg_index - b.leg_index
      )
      return { parent: parentRow as TransportItemRow, legs: sorted }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSPORT_KEY })
    },
  })
}

export function useUpdateJourney() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      parentPatch,
      legs,
      legIdsToDelete,
    }: {
      id: string
      parentPatch?: TransportItemUpdate
      legs: LegDraft[]
      legIdsToDelete?: string[]
    }) => {
      if (parentPatch && Object.keys(parentPatch).length > 0) {
        const { error } = await supabase.from('transport_items').update(parentPatch).eq('id', id)
        if (error) throw error
      }

      if (legIdsToDelete && legIdsToDelete.length > 0) {
        const { error } = await supabase.from('transport_legs').delete().in('id', legIdsToDelete)
        if (error) throw error
      }

      // Split legs into existing vs new; leg_index is derived from array position.
      const inserts: TransportLegInsert[] = []
      const updates: { id: string; patch: TransportLegUpdate }[] = []
      legs.forEach((leg, index) => {
        if (leg.id) {
          const { id: legId, ...rest } = leg
          updates.push({ id: legId, patch: { ...rest, leg_index: index } })
        } else {
          const { id: _draftId, ...rest } = leg
          inserts.push({ ...rest, transport_id: id, leg_index: index })
        }
      })

      // Apply updates first. The unique(transport_id, leg_index) constraint can conflict
      // mid-sequence when legs are reordered, so we stage indices into a disjoint range
      // then correct them. Simpler alternative: update non-index fields first, then leg_index
      // in a second pass — still racy. Real fix: update in two passes via a large temp offset.
      if (updates.length > 0) {
        const OFFSET = 1_000_000
        for (const u of updates) {
          const { error } = await supabase
            .from('transport_legs')
            .update({ ...u.patch, leg_index: OFFSET + (u.patch.leg_index as number) })
            .eq('id', u.id)
          if (error) throw error
        }
        for (const u of updates) {
          const { error } = await supabase
            .from('transport_legs')
            .update({ leg_index: u.patch.leg_index })
            .eq('id', u.id)
          if (error) throw error
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('transport_legs').insert(inserts)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSPORT_KEY })
    },
  })
}

export function useDeleteTransportItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dayDate }: { id: string; dayDate: string }) => {
      const { error } = await supabase.from('transport_items').delete().eq('id', id)
      if (error) throw error
      return { dayDate }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSPORT_KEY })
    },
  })
}
