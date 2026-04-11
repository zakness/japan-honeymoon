import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PlaceRow, PlaceInsert, PlaceUpdate } from '@/types/places'

export interface PlacesFilter {
  category?: PlaceRow['category']
  priority?: PlaceRow['priority']
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

        const places = data
          .map((item) => item.place)
          .filter((p): p is PlaceRow => p !== null)

        return places
      }

      let query = supabase.from('places').select('*').order('created_at', { ascending: false })

      if (filter?.category) query = query.eq('category', filter.category)
      if (filter?.priority)  query = query.eq('priority', filter.priority)
      if (filter?.status)    query = query.eq('status', filter.status)
      if (filter?.city)      query = query.eq('city', filter.city)

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
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as PlaceRow
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
      const { data, error } = await supabase
        .from('places')
        .insert(place)
        .select()
        .single()
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
      queryClient.setQueryData([...PLACES_KEY, updated.id], updated)
    },
  })
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
    },
  })
}
