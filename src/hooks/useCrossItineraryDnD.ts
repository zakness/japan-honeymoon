import { useState } from 'react'
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import {
  ITINERARY_KEY,
  useCreateItineraryItem,
  useReorderDayItemsDynamic,
  type DayReorderItem,
} from './useItinerary'
import { TRANSPORT_KEY } from './useTransport'
import { useMoveItemToDay } from './useMoveItemToDay'
import { mergeSlotItems, slotItemId, slotItemTimeSlot } from '@/lib/transport-utils'
import { parseSlotDropId, type TimeSlot } from '@/types/itinerary'
import type { Journey, SlotItem, SlotItemKind } from '@/types/transport'
import type { ItineraryItemWithPlace } from '@/types/itinerary'
import type { TripDay } from '@/config/trip'
import type { PlaceRow } from '@/types/places'

type ActiveDrag = { type: 'slot'; item: SlotItem } | { type: 'place'; place: PlaceRow } | null

export function useCrossItineraryDnD(cityDays: TripDay[]) {
  const queryClient = useQueryClient()
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null)

  const reorderDay = useReorderDayItemsDynamic()
  const moveToDay = useMoveItemToDay()
  const createItem = useCreateItineraryItem()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function getItemsForDay(dayDate: string): SlotItem[] {
    const itinerary =
      queryClient.getQueryData<ItineraryItemWithPlace[]>([...ITINERARY_KEY, dayDate]) ?? []
    const journeys = queryClient.getQueryData<Journey[]>([...TRANSPORT_KEY, dayDate]) ?? []
    const grouped = mergeSlotItems(itinerary, journeys)
    return [...grouped.morning, ...grouped.afternoon, ...grouped.evening]
  }

  function handleDragStart({ active }: DragStartEvent) {
    const activeId = active.id as string

    if (activeId.startsWith('unscheduled-')) {
      const place = active.data.current?.place as PlaceRow | undefined
      setActiveDrag(place ? { type: 'place', place } : null)
      return
    }

    for (const day of cityDays) {
      const found = getItemsForDay(day.date).find((i) => slotItemId(i) === activeId)
      if (found) {
        setActiveDrag({ type: 'slot', item: found })
        return
      }
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const slotTarget = parseSlotDropId(overId)

    // ── Unscheduled → Day drop ──────────────────────────────────────────────
    if (activeId.startsWith('unscheduled-')) {
      let targetDayDate: string | null = null
      let targetSlot: TimeSlot | null = null

      if (slotTarget) {
        targetDayDate = slotTarget.dayDate
        targetSlot = slotTarget.slot
      } else {
        for (const day of cityDays) {
          const found = getItemsForDay(day.date).find((i) => slotItemId(i) === overId)
          if (found) {
            targetDayDate = day.date
            targetSlot = slotItemTimeSlot(found) as TimeSlot
            break
          }
        }
      }

      if (!targetDayDate || !targetSlot) return

      const placeId = activeId.slice('unscheduled-'.length)
      const slotItems = getItemsForDay(targetDayDate).filter(
        (i) => slotItemTimeSlot(i) === targetSlot
      )
      createItem.mutate({
        day_date: targetDayDate,
        place_id: placeId,
        time_slot: targetSlot,
        sort_order: slotItems.length,
      })
      return
    }

    // ── Scheduled item drag ─────────────────────────────────────────────────
    const sourceData = active.data.current as
      | { dayDate: string; kind: SlotItemKind; timeSlot: TimeSlot }
      | undefined
    if (!sourceData) return

    const { dayDate: sourceDayDate, kind: sourceKind, timeSlot: sourceSlot } = sourceData
    const sourceItems = getItemsForDay(sourceDayDate)

    // Resolve target day + slot
    let targetDayDate: string
    let targetSlot: TimeSlot

    if (slotTarget) {
      targetDayDate = slotTarget.dayDate
      targetSlot = slotTarget.slot
    } else {
      let found = false
      for (const day of cityDays) {
        const item = getItemsForDay(day.date).find((i) => slotItemId(i) === overId)
        if (item) {
          targetDayDate = day.date
          targetSlot = slotItemTimeSlot(item) as TimeSlot
          found = true
          break
        }
      }
      if (!found) return
    }

    // ── Same-day move ───────────────────────────────────────────────────────
    if (sourceDayDate === targetDayDate!) {
      const grouped = mergeSlotItems(
        sourceItems
          .filter((i) => i.kind === 'itinerary')
          .map((i) => i.data as ItineraryItemWithPlace),
        sourceItems.filter((i) => i.kind === 'transport').map((i) => i.data as Journey)
      )
      const sourceSlotItems = grouped[sourceSlot]
      const targetSlotItems = grouped[targetSlot!]

      if (sourceSlot === targetSlot!) {
        const oldIndex = sourceSlotItems.findIndex((i) => slotItemId(i) === activeId)
        const newIndex = slotTarget
          ? sourceSlotItems.length - 1
          : sourceSlotItems.findIndex((i) => slotItemId(i) === overId)
        if (oldIndex === newIndex) return
        const reordered = arrayMove(sourceSlotItems, oldIndex, newIndex)
        reorderDay.mutate({
          dayDate: sourceDayDate,
          items: reordered.map((item, idx) => ({
            id: slotItemId(item),
            kind: item.kind,
            sort_order: idx,
            time_slot: targetSlot!,
          })),
        })
      } else {
        const withoutActive = sourceSlotItems.filter((i) => slotItemId(i) !== activeId)
        const fromUpdates: DayReorderItem[] = withoutActive.map((item, idx) => ({
          id: slotItemId(item),
          kind: item.kind,
          sort_order: idx,
          time_slot: sourceSlot,
        }))
        const insertAt = slotTarget
          ? targetSlotItems.length
          : targetSlotItems.findIndex((i) => slotItemId(i) === overId)
        const activeItem = sourceItems.find((i) => slotItemId(i) === activeId)!
        const movedItem: SlotItem =
          activeItem.kind === 'itinerary'
            ? { kind: 'itinerary', data: { ...activeItem.data, time_slot: targetSlot! } }
            : {
                kind: 'transport',
                data: {
                  ...activeItem.data,
                  parent: { ...activeItem.data.parent, time_slot: targetSlot! },
                },
              }
        const newTarget = [...targetSlotItems]
        newTarget.splice(insertAt, 0, movedItem)
        const toUpdates: DayReorderItem[] = newTarget.map((item, idx) => ({
          id: slotItemId(item),
          kind: item.kind,
          sort_order: idx,
          time_slot: targetSlot!,
        }))
        reorderDay.mutate({ dayDate: sourceDayDate, items: [...fromUpdates, ...toUpdates] })
      }
      return
    }

    // ── Cross-day move ──────────────────────────────────────────────────────
    const targetItems = getItemsForDay(targetDayDate!)
    const sourceSlotItems = sourceItems.filter((i) => slotItemTimeSlot(i) === sourceSlot)
    const targetSlotItems = targetItems.filter((i) => slotItemTimeSlot(i) === targetSlot!)

    const fromSlotUpdates: DayReorderItem[] = sourceSlotItems
      .filter((i) => slotItemId(i) !== activeId)
      .map((item, idx) => ({
        id: slotItemId(item),
        kind: item.kind,
        sort_order: idx,
        time_slot: sourceSlot,
      }))

    const insertAt = slotTarget
      ? targetSlotItems.length
      : Math.max(
          0,
          targetSlotItems.findIndex((i) => slotItemId(i) === overId)
        )
    const newTargetSlot = [...targetSlotItems]
    newTargetSlot.splice(insertAt, 0, sourceItems.find((i) => slotItemId(i) === activeId)!)
    const toSlotUpdates: DayReorderItem[] = newTargetSlot.map((item, idx) => ({
      id: slotItemId(item),
      kind: item.kind,
      sort_order: idx,
      time_slot: targetSlot!,
    }))

    moveToDay.mutate({
      itemId: activeId,
      itemKind: sourceKind,
      fromDayDate: sourceDayDate,
      fromSlotUpdates,
      toDayDate: targetDayDate!,
      toSlot: targetSlot!,
      toSlotUpdates,
    })
  }

  return { sensors, activeDrag, handleDragStart, handleDragEnd }
}
