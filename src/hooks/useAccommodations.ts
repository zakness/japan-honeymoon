import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AccommodationRow } from '@/types/accommodations'
import type { TablesUpdate } from '@/types/database'

const ACCOMMODATIONS_KEY = ['accommodations'] as const

export type AccommodationUpdate = TablesUpdate<'accommodations'>

export function useAccommodations() {
  return useQuery({
    queryKey: ACCOMMODATIONS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .order('check_in_date', { ascending: true })
      if (error) throw error
      return data as AccommodationRow[]
    },
    staleTime: Infinity, // seed data never changes
  })
}

/**
 * Returns the accommodation(s) relevant to a given date for the day itinerary.
 * - morningHotel: where you woke up (check_in_date < date <= check_out_date)
 * - eveningHotel: where you're sleeping (check_in_date <= date < check_out_date)
 */
export function useAccommodationsForDate(date: string) {
  const { data: all = [] } = useAccommodations()

  const morningHotel = all.find((a) => a.check_in_date < date && date <= a.check_out_date) ?? null
  const eveningHotel = all.find((a) => a.check_in_date <= date && date < a.check_out_date) ?? null

  return { morningHotel, eveningHotel }
}

export function useUpdateAccommodation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: AccommodationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('accommodations')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as AccommodationRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOMMODATIONS_KEY })
    },
  })
}
