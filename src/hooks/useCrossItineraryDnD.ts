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
import { useNestPlace } from './usePlaces'
import { useIsDesktop } from './useIsDesktop'
import { mergeSlotItems, slotItemId, slotItemTimeSlot } from '@/lib/transport-utils'
import { parseReorderDropId, parseSlotDropId, type TimeSlot } from '@/types/itinerary'
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
  const nest = useNestPlace()

  // Gate DnD on desktop only. On mobile, touch scrolling on cards otherwise
  // gets stolen by drag activation; passing no sensors disables DnD entirely
  // (cards' spread `{...listeners}` become no-ops). See useIsDesktop for the
  // 640px breakpoint rationale.
  const isDesktop = useIsDesktop()
  const desktopSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )
  const mobileSensors = useSensors()
  const sensors = isDesktop ? desktopSensors : mobileSensors

  function getItemsForDay(dayDate: string): SlotItem[] {
    const itinerary =
      queryClient.getQueryData<ItineraryItemWithPlace[]>([...ITINERARY_KEY, dayDate]) ?? []
    const journeys = queryClient.getQueryData<Journey[]>([...TRANSPORT_KEY, dayDate]) ?? []
    const grouped = mergeSlotItems(itinerary, journeys)
    return Object.values(grouped).flat()
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

    // ── Place-nest drop ─────────────────────────────────────────────────────
    // Dropping any place card (backlog or scheduled itinerary item) onto
    // another place card's `nest-{placeId}` zone nests the dragged place
    // under the target. Handled before slot routing so the nest semantics
    // take precedence over reorder / insert.
    if (overId.startsWith('nest-')) {
      const parentId = overId.slice('nest-'.length)
      const childId = resolveDraggedPlaceId(active.id, active.data.current)
      if (!childId || childId === parentId) return
      nest.mutate({ childId, parentId })
      return
    }

    const slotTarget = parseSlotDropId(overId)
    const reorderTarget = parseReorderDropId(overId)

    // ── Unscheduled → Day drop ──────────────────────────────────────────────
    if (activeId.startsWith('unscheduled-')) {
      let targetDayDate: string | null = null
      let targetSlot: TimeSlot | null = null
      let targetIndex: number | null = null

      if (reorderTarget) {
        targetDayDate = reorderTarget.dayDate
        targetSlot = reorderTarget.slot
        targetIndex = reorderTarget.index
      } else if (slotTarget) {
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
      // Targeting a specific gap: append + renumber to land at the requested
      // index. Bare slot or fallthrough: just append.
      if (targetIndex != null && targetIndex < slotItems.length) {
        const tDay = targetDayDate
        const tSlot = targetSlot
        const insertAt = targetIndex
        void (async () => {
          try {
            const created = await createItem.mutateAsync({
              day_date: tDay,
              place_id: placeId,
              time_slot: tSlot,
              sort_order: slotItems.length,
            })
            const reordered = [
              ...slotItems.slice(0, insertAt),
              { kind: 'itinerary' as const, data: created },
              ...slotItems.slice(insertAt),
            ]
            await reorderDay.mutateAsync({
              dayDate: tDay,
              items: reordered.map((item, idx) => ({
                id: slotItemId(item),
                kind: item.kind,
                sort_order: idx,
                time_slot: tSlot,
              })),
            })
          } catch {
            // mutation hooks already surface errors via toast; nothing else to do.
          }
        })()
      } else {
        createItem.mutate({
          day_date: targetDayDate,
          place_id: placeId,
          time_slot: targetSlot,
          sort_order: slotItems.length,
        })
      }
      return
    }

    // ── Scheduled item drag ─────────────────────────────────────────────────
    const sourceData = active.data.current as
      | { dayDate: string; kind: SlotItemKind; timeSlot: TimeSlot }
      | undefined
    if (!sourceData) return

    const { dayDate: sourceDayDate, kind: sourceKind, timeSlot: sourceSlot } = sourceData
    const sourceItems = getItemsForDay(sourceDayDate)

    // Resolve target day + slot (+ optional explicit insertion index from a
    // `reorder-{date}-{slot}-{index}` gap drop).
    let targetDayDate: string
    let targetSlot: TimeSlot
    let explicitTargetIndex: number | null = null

    if (reorderTarget) {
      targetDayDate = reorderTarget.dayDate
      targetSlot = reorderTarget.slot
      explicitTargetIndex = reorderTarget.index
    } else if (slotTarget) {
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
        // Gap drops give us an explicit insertion index in the ORIGINAL list
        // (before removing source). Adjust by -1 when inserting after source,
        // since removing source shifts later positions.
        let newIndex: number
        if (explicitTargetIndex != null) {
          newIndex = explicitTargetIndex > oldIndex ? explicitTargetIndex - 1 : explicitTargetIndex
        } else if (slotTarget) {
          newIndex = sourceSlotItems.length - 1
        } else {
          newIndex = sourceSlotItems.findIndex((i) => slotItemId(i) === overId)
        }
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
        const insertAt =
          explicitTargetIndex != null
            ? Math.min(explicitTargetIndex, targetSlotItems.length)
            : slotTarget
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
    // Hotel check-in / check-out items are pinned to their stay's date. Moving
    // them across days would imply changing `accommodations.check_in_date` /
    // `check_out_date`, which is a deliberate edit that belongs in the hotel
    // form, not in a drag. Reject cross-day drops for these items; intra-day
    // reorder above is untouched.
    const activeItemForGuard = sourceItems.find((i) => slotItemId(i) === activeId)
    if (
      activeItemForGuard?.kind === 'itinerary' &&
      (activeItemForGuard.data as ItineraryItemWithPlace).accommodation_id
    ) {
      return
    }

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

    const insertAt =
      explicitTargetIndex != null
        ? Math.min(explicitTargetIndex, targetSlotItems.length)
        : slotTarget
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

/**
 * Extract the place id from a drag's active descriptor. Backlog drags encode
 * the id in the active.id (`unscheduled-{placeId}`); day-column drags pass
 * `placeId` through `active.data.current`. Transport drags have no place and
 * return null — nest is a no-op for them.
 */
function resolveDraggedPlaceId(
  activeId: string | number,
  data: Record<string, unknown> | undefined
): string | null {
  const id = String(activeId)
  if (id.startsWith('unscheduled-')) return id.slice('unscheduled-'.length)
  const placeId = data?.placeId
  if (typeof placeId === 'string') return placeId
  const place = data?.place as { id?: string } | undefined
  return place?.id ?? null
}
