import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { TimeSlotGroup } from './TimeSlotGroup'
import { ItineraryItem } from './ItineraryItem'
import { useItineraryItems, useReorderItineraryItems } from '@/hooks/useItinerary'
import { TIME_SLOTS, type TimeSlot, type ItineraryItemWithPlace } from '@/types/itinerary'

interface DayItineraryProps {
  dayDate: string
  onSelectPlace?: (placeId: string) => void
}

export function DayItinerary({ dayDate, onSelectPlace }: DayItineraryProps) {
  const { data: items = [], isLoading } = useItineraryItems(dayDate)
  const reorder = useReorderItineraryItems(dayDate)
  const [activeItem, setActiveItem] = useState<ItineraryItemWithPlace | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const grouped: Record<TimeSlot, ItineraryItemWithPlace[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  }
  for (const item of items) {
    const slot = (item.time_slot as TimeSlot) || 'morning'
    grouped[slot].push(item)
  }
  // Sort each group by sort_order
  for (const slot of Object.keys(grouped) as TimeSlot[]) {
    grouped[slot].sort((a, b) => a.sort_order - b.sort_order)
  }

  function handleDragStart(event: DragStartEvent) {
    const item = items.find((i) => i.id === event.active.id)
    setActiveItem(item ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Determine target time slot: droppable slot zones have id "slot-morning" etc.
    const targetSlot = overId.startsWith('slot-')
      ? (overId.replace('slot-', '') as TimeSlot)
      : ((items.find((i) => i.id === overId)?.time_slot as TimeSlot) ?? 'morning')

    const currentItem = items.find((i) => i.id === activeId)
    if (!currentItem) return

    // Build new ordered list within the target slot
    const slotItems = grouped[targetSlot]
    const sourceSlotItems = grouped[currentItem.time_slot as TimeSlot]

    let newSlotItems: ItineraryItemWithPlace[]

    if (currentItem.time_slot === targetSlot) {
      // Reordering within the same slot
      const oldIndex = slotItems.findIndex((i) => i.id === activeId)
      const newIndex = overId.startsWith('slot-')
        ? slotItems.length - 1
        : slotItems.findIndex((i) => i.id === overId)
      if (oldIndex === newIndex) return
      newSlotItems = arrayMove(slotItems, oldIndex, newIndex)
    } else {
      // Moving to a different slot
      const withoutActive = sourceSlotItems.filter((i) => i.id !== activeId)
      // Re-number source slot
      const sourceUpdates = withoutActive.map((item, idx) => ({
        id: item.id,
        sort_order: idx,
        time_slot: item.time_slot as TimeSlot,
      }))

      const insertIndex = overId.startsWith('slot-')
        ? slotItems.length
        : slotItems.findIndex((i) => i.id === overId)
      const newList = [...slotItems]
      newList.splice(insertIndex, 0, { ...currentItem, time_slot: targetSlot })
      newSlotItems = newList

      const targetUpdates = newSlotItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx,
        time_slot: targetSlot,
      }))

      reorder.mutate([...sourceUpdates, ...targetUpdates])
      return
    }

    const updates = newSlotItems.map((item, idx) => ({
      id: item.id,
      sort_order: idx,
      time_slot: targetSlot,
    }))
    reorder.mutate(updates)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-3xl">📅</p>
        <p className="text-sm font-medium">No items yet</p>
        <p className="text-xs text-muted-foreground">Add places from the backlog or add a note</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        {TIME_SLOTS.map(({ value, label }) => (
          <TimeSlotGroup
            key={value}
            slot={value}
            label={label}
            items={grouped[value]}
            dayDate={dayDate}
            onSelectPlace={onSelectPlace}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="opacity-90 shadow-lg">
            <ItineraryItem item={activeItem} dayDate={dayDate} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
