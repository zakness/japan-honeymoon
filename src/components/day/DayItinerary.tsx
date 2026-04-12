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
import { TransportItem } from './TransportItem'
import { useItineraryItems, useReorderDayItems, type DayReorderItem } from '@/hooks/useItinerary'
import { useTransportItems } from '@/hooks/useTransport'
import { useFlights } from '@/hooks/useFlights'
import { useAccommodations, useAccommodationsForDate } from '@/hooks/useAccommodations'
import { getHotelColor, getHotelBgColor } from '@/lib/hotel-colors'
import { mergeSlotItems } from '@/lib/transport-utils'
import { getFlightEventsForDate } from '@/lib/logistics-utils'
import { TIME_SLOTS, deriveTimeSlot, type TimeSlot } from '@/types/itinerary'
import { type SlotItem } from '@/types/transport'

interface DayItineraryProps {
  dayDate: string
  onSelectPlace?: (placeId: string) => void
  onSelectHotel?: (hotelId: string) => void
}

export function DayItinerary({ dayDate, onSelectPlace, onSelectHotel }: DayItineraryProps) {
  const { data: itineraryItems = [], isLoading: itineraryLoading } = useItineraryItems(dayDate)
  const { data: transportItems = [], isLoading: transportLoading } = useTransportItems(dayDate)
  const { data: flights = [], isLoading: flightsLoading } = useFlights()
  const reorder = useReorderDayItems(dayDate)
  const { morningHotel, eveningHotel } = useAccommodationsForDate(dayDate)
  const { data: allHotels = [] } = useAccommodations()
  const [activeItem, setActiveItem] = useState<SlotItem | null>(null)

  const flightEvents = getFlightEventsForDate(flights, dayDate)
  const flightEventsBySlot = {
    morning: flightEvents.filter((e) => deriveTimeSlot(e.localTime) === 'morning'),
    afternoon: flightEvents.filter((e) => deriveTimeSlot(e.localTime) === 'afternoon'),
    evening: flightEvents.filter((e) => deriveTimeSlot(e.localTime) === 'evening'),
  }
  const isLoading = itineraryLoading || transportLoading || flightsLoading

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const grouped = mergeSlotItems(itineraryItems, transportItems)

  const allItems: SlotItem[] = [...grouped.morning, ...grouped.afternoon, ...grouped.evening]

  function handleDragStart(event: DragStartEvent) {
    const found = allItems.find((i) => i.data.id === event.active.id)
    setActiveItem(found ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const targetSlot = overId.startsWith('slot-')
      ? (overId.replace('slot-', '') as TimeSlot)
      : ((allItems.find((i) => i.data.id === overId)?.data.time_slot as TimeSlot) ?? 'morning')

    const currentItem = allItems.find((i) => i.data.id === activeId)
    if (!currentItem) return

    const currentSlot = currentItem.data.time_slot as TimeSlot
    const slotItems = grouped[targetSlot]
    const sourceSlotItems = grouped[currentSlot]

    if (currentSlot === targetSlot) {
      const oldIndex = slotItems.findIndex((i) => i.data.id === activeId)
      const newIndex = overId.startsWith('slot-')
        ? slotItems.length - 1
        : slotItems.findIndex((i) => i.data.id === overId)
      if (oldIndex === newIndex) return
      const newSlotItems = arrayMove(slotItems, oldIndex, newIndex)

      const updates: DayReorderItem[] = newSlotItems.map((item, idx) => ({
        id: item.data.id,
        kind: item.kind,
        sort_order: idx,
        time_slot: targetSlot,
      }))
      reorder.mutate(updates)
    } else {
      const withoutActive = sourceSlotItems.filter((i) => i.data.id !== activeId)
      const sourceUpdates: DayReorderItem[] = withoutActive.map((item, idx) => ({
        id: item.data.id,
        kind: item.kind,
        sort_order: idx,
        time_slot: currentSlot,
      }))

      const insertIndex = overId.startsWith('slot-')
        ? slotItems.length
        : slotItems.findIndex((i) => i.data.id === overId)
      const newList = [...slotItems]
      const movedItem = {
        ...currentItem,
        data: { ...currentItem.data, time_slot: targetSlot },
      } as SlotItem
      newList.splice(insertIndex, 0, movedItem)

      const targetUpdates: DayReorderItem[] = newList.map((item, idx) => ({
        id: item.data.id,
        kind: item.kind,
        sort_order: idx,
        time_slot: targetSlot,
      }))

      reorder.mutate([...sourceUpdates, ...targetUpdates])
    }
  }

  const hasContent =
    itineraryItems.length > 0 ||
    transportItems.length > 0 ||
    morningHotel ||
    eveningHotel ||
    flightEvents.length > 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!hasContent) {
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
        {TIME_SLOTS.map(({ value, label }) => {
          const anchor =
            value === 'morning' ? morningHotel : value === 'evening' ? eveningHotel : null
          return (
            <TimeSlotGroup
              key={value}
              slot={value}
              label={label}
              items={grouped[value]}
              dayDate={dayDate}
              flightEvents={flightEventsBySlot[value]}
              hotelAnchor={anchor}
              hotelColor={anchor ? getHotelColor(anchor, allHotels) : undefined}
              hotelBgColor={anchor ? getHotelBgColor(anchor, allHotels) : undefined}
              onSelectPlace={onSelectPlace}
              onSelectHotel={onSelectHotel}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="opacity-90 shadow-lg">
            {activeItem.kind === 'itinerary' ? (
              <ItineraryItem item={activeItem.data} dayDate={dayDate} />
            ) : (
              <TransportItem item={activeItem.data} dayDate={dayDate} />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
