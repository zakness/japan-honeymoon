import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TransportItemInsert, TransportItemRow, TransportItemUpdate } from '@/types/transport'

export const TRANSPORT_KEY = ['transport'] as const

// ---- Queries ----

export function useAllTransportItems() {
  return useQuery({
    queryKey: TRANSPORT_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_items')
        .select('*')
        .order('day_date', { ascending: true })
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as TransportItemRow[]
    },
    staleTime: Infinity,
  })
}

export function useTransportItems(dayDate: string) {
  return useQuery({
    queryKey: [...TRANSPORT_KEY, dayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_items')
        .select('*')
        .eq('day_date', dayDate)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as TransportItemRow[]
    },
    enabled: !!dayDate,
  })
}

// ---- Mutations ----

export function useCreateTransportItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: TransportItemInsert) => {
      const { data, error } = await supabase
        .from('transport_items')
        .insert(item)
        .select('*')
        .single()
      if (error) throw error
      return data as TransportItemRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSPORT_KEY })
    },
  })
}

export function useUpdateTransportItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: TransportItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('transport_items')
        .update(update)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as TransportItemRow
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
