import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  ItineraryItemRow,
  ItineraryItemInsert,
  ItineraryItemUpdate,
  ItineraryItemWithPlace,
} from '@/types/itinerary'

const ITINERARY_KEY = ['itinerary'] as const
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

export function useUnscheduledPlaces() {
  return useQuery({
    queryKey: [...PLACES_KEY, 'unscheduled'],
    queryFn: async () => {
      // Step 1: get all place IDs that are already scheduled
      const { data: scheduled, error: schedErr } = await supabase
        .from('itinerary_items')
        .select('place_id')
        .not('place_id', 'is', null)

      if (schedErr) throw schedErr

      const scheduledIds = scheduled.map((r) => r.place_id).filter(Boolean) as string[]

      // Step 2: fetch all places excluding those IDs
      let query = supabase.from('places').select('*').order('created_at', { ascending: false })

      if (scheduledIds.length > 0) {
        query = query.not('id', 'in', `(${scheduledIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

// ---- Mutations ----

export function useCreateItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: ItineraryItemInsert) => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert(item)
        .select('*, place:places(*)')
        .single()
      if (error) throw error
      return data as ItineraryItemWithPlace
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, created.day_date] })
      queryClient.invalidateQueries({ queryKey: [...PLACES_KEY, 'unscheduled'] })
    },
  })
}

export function useUpdateItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: ItineraryItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .update(update)
        .eq('id', id)
        .select('*, place:places(*)')
        .single()
      if (error) throw error
      return data as ItineraryItemWithPlace
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, updated.day_date] })
    },
  })
}

export function useDeleteItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dayDate }: { id: string; dayDate: string }) => {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', id)
      if (error) throw error
      return { dayDate }
    },
    onSuccess: ({ dayDate }) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, dayDate] })
      queryClient.invalidateQueries({ queryKey: [...PLACES_KEY, 'unscheduled'] })
    },
  })
}

export interface ReorderItem {
  id: string
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
