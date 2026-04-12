import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ITINERARY_KEY } from './useItinerary'
import { TRANSPORT_KEY } from './useTransport'
import type { DayReorderItem } from './useItinerary'
import type { SlotItemKind, TransportItemRow } from '@/types/transport'
import type { ItineraryItemWithPlace, TimeSlot } from '@/types/itinerary'

export interface CrossDayMovePayload {
  itemId: string
  itemKind: SlotItemKind
  fromDayDate: string
  /** Renumbered remaining items in the source slot (moved item excluded) */
  fromSlotUpdates: DayReorderItem[]
  toDayDate: string
  toSlot: TimeSlot
  /** Renumbered items in the target slot, including the moved item */
  toSlotUpdates: DayReorderItem[]
}

function table(kind: SlotItemKind) {
  return kind === 'itinerary' ? 'itinerary_items' : 'transport_items'
}

export function useMoveItemToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      itemKind,
      fromSlotUpdates,
      toDayDate,
      toSlot,
      toSlotUpdates,
    }: CrossDayMovePayload) => {
      const movedUpdate = toSlotUpdates.find((u) => u.id === itemId)!
      const updates = [
        // Move item to new day/slot/position
        supabase
          .from(table(itemKind))
          .update({ day_date: toDayDate, time_slot: toSlot, sort_order: movedUpdate.sort_order })
          .eq('id', itemId),
        // Renumber remaining source slot items
        ...fromSlotUpdates.map(({ id, sort_order, time_slot, kind }) =>
          supabase.from(table(kind)).update({ sort_order, time_slot }).eq('id', id)
        ),
        // Renumber other target slot items (moved item already updated above)
        ...toSlotUpdates
          .filter((u) => u.id !== itemId)
          .map(({ id, sort_order, time_slot, kind }) =>
            supabase.from(table(kind)).update({ sort_order, time_slot }).eq('id', id)
          ),
      ]
      const results = await Promise.all(updates)
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },

    onMutate: async ({
      itemId,
      itemKind,
      fromDayDate,
      fromSlotUpdates,
      toDayDate,
      toSlot,
      toSlotUpdates,
    }) => {
      // Cancel both days' queries
      await queryClient.cancelQueries({ queryKey: [...ITINERARY_KEY, fromDayDate] })
      await queryClient.cancelQueries({ queryKey: [...ITINERARY_KEY, toDayDate] })
      await queryClient.cancelQueries({ queryKey: [...TRANSPORT_KEY, fromDayDate] })
      await queryClient.cancelQueries({ queryKey: [...TRANSPORT_KEY, toDayDate] })

      const prevFromItinerary = queryClient.getQueryData([...ITINERARY_KEY, fromDayDate])
      const prevFromTransport = queryClient.getQueryData([...TRANSPORT_KEY, fromDayDate])
      const prevToItinerary = queryClient.getQueryData([...ITINERARY_KEY, toDayDate])
      const prevToTransport = queryClient.getQueryData([...TRANSPORT_KEY, toDayDate])

      const movedUpdate = toSlotUpdates.find((u) => u.id === itemId)!

      if (itemKind === 'itinerary') {
        const fromCache =
          queryClient.getQueryData<ItineraryItemWithPlace[]>([...ITINERARY_KEY, fromDayDate]) ?? []
        const movedItem = fromCache.find((i) => i.id === itemId)

        // Remove from source day
        queryClient.setQueryData(
          [...ITINERARY_KEY, fromDayDate],
          fromCache
            .filter((i) => i.id !== itemId)
            .map((i) => {
              const u = fromSlotUpdates.find((u) => u.id === i.id)
              return u ? { ...i, sort_order: u.sort_order } : i
            })
            .sort((a, b) => a.sort_order - b.sort_order)
        )

        // Add to target day
        if (movedItem) {
          const updated = {
            ...movedItem,
            day_date: toDayDate,
            time_slot: toSlot,
            sort_order: movedUpdate.sort_order,
          }
          queryClient.setQueryData(
            [...ITINERARY_KEY, toDayDate],
            (old: ItineraryItemWithPlace[] | undefined) =>
              [
                ...(old ?? []).map((i) => {
                  const u = toSlotUpdates.find((u) => u.id === i.id)
                  return u ? { ...i, sort_order: u.sort_order, time_slot: u.time_slot } : i
                }),
                updated,
              ].sort((a, b) => a.sort_order - b.sort_order)
          )
        }
      } else {
        const fromCache =
          queryClient.getQueryData<TransportItemRow[]>([...TRANSPORT_KEY, fromDayDate]) ?? []
        const movedItem = fromCache.find((i) => i.id === itemId)

        queryClient.setQueryData(
          [...TRANSPORT_KEY, fromDayDate],
          fromCache
            .filter((i) => i.id !== itemId)
            .map((i) => {
              const u = fromSlotUpdates.find((u) => u.id === i.id)
              return u ? { ...i, sort_order: u.sort_order } : i
            })
            .sort((a, b) => a.sort_order - b.sort_order)
        )

        if (movedItem) {
          const updated = {
            ...movedItem,
            day_date: toDayDate,
            time_slot: toSlot,
            sort_order: movedUpdate.sort_order,
          }
          queryClient.setQueryData(
            [...TRANSPORT_KEY, toDayDate],
            (old: TransportItemRow[] | undefined) =>
              [
                ...(old ?? []).map((i) => {
                  const u = toSlotUpdates.find((u) => u.id === i.id)
                  return u ? { ...i, sort_order: u.sort_order, time_slot: u.time_slot } : i
                }),
                updated,
              ].sort((a, b) => a.sort_order - b.sort_order)
          )
        }
      }

      return { prevFromItinerary, prevFromTransport, prevToItinerary, prevToTransport }
    },

    onError: (_err, { fromDayDate, toDayDate }, ctx) => {
      if (ctx?.prevFromItinerary)
        queryClient.setQueryData([...ITINERARY_KEY, fromDayDate], ctx.prevFromItinerary)
      if (ctx?.prevFromTransport)
        queryClient.setQueryData([...TRANSPORT_KEY, fromDayDate], ctx.prevFromTransport)
      if (ctx?.prevToItinerary)
        queryClient.setQueryData([...ITINERARY_KEY, toDayDate], ctx.prevToItinerary)
      if (ctx?.prevToTransport)
        queryClient.setQueryData([...TRANSPORT_KEY, toDayDate], ctx.prevToTransport)
    },

    onSettled: (_data, _err, { fromDayDate, toDayDate }) => {
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, fromDayDate] })
      queryClient.invalidateQueries({ queryKey: [...TRANSPORT_KEY, fromDayDate] })
      queryClient.invalidateQueries({ queryKey: [...ITINERARY_KEY, toDayDate] })
      queryClient.invalidateQueries({ queryKey: [...TRANSPORT_KEY, toDayDate] })
    },
  })
}
