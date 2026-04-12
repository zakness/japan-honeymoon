import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FlightRow } from '@/types/flights'

const FLIGHTS_KEY = ['flights'] as const

export function useFlights() {
  return useQuery({
    queryKey: FLIGHTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .order('departure_at', { ascending: true })
      if (error) throw error
      return data as FlightRow[]
    },
    staleTime: Infinity,
  })
}
