import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ItineraryItem } from './ItineraryItem'
import { TransportItem } from './TransportItem'
import { HotelAnchor } from './HotelAnchor'
import { type TimeSlot } from '@/types/itinerary'
import { type SlotItem } from '@/types/transport'
import type { AccommodationRow } from '@/types/accommodations'
import { cn } from '@/lib/utils'

interface TimeSlotGroupProps {
  slot: TimeSlot
  label: string
  items: SlotItem[]
  dayDate: string
  hotelAnchor?: AccommodationRow | null
  hotelColor?: string
  hotelBgColor?: string
  onSelectPlace?: (placeId: string) => void
  onSelectHotel?: (hotelId: string) => void
}

export function TimeSlotGroup({
  slot,
  label,
  items,
  dayDate,
  hotelAnchor,
  hotelColor = '#5b21b6',
  hotelBgColor = '#ede9fe',
  onSelectPlace,
  onSelectHotel,
}: TimeSlotGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slot}` })
  const isEmpty = items.length === 0 && !hotelAnchor

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {label}
      </h3>
      <SortableContext items={items.map((i) => i.data.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'space-y-1.5 min-h-[52px] rounded-lg transition-colors p-1',
            isOver ? 'bg-accent/50 ring-1 ring-accent' : ''
          )}
        >
          {slot === 'morning' && hotelAnchor && (
            <HotelAnchor
              hotel={hotelAnchor}
              slot="morning"
              color={hotelColor}
              bgColor={hotelBgColor}
              onViewOnMap={onSelectHotel ? () => onSelectHotel(hotelAnchor.id) : undefined}
            />
          )}
          {items.map((item) =>
            item.kind === 'itinerary' ? (
              <ItineraryItem
                key={item.data.id}
                item={item.data}
                dayDate={dayDate}
                onSelectPlace={onSelectPlace}
              />
            ) : (
              <TransportItem key={item.data.id} item={item.data} dayDate={dayDate} />
            )
          )}
          {slot === 'evening' && hotelAnchor && (
            <HotelAnchor
              hotel={hotelAnchor}
              slot="evening"
              color={hotelColor}
              bgColor={hotelBgColor}
              onViewOnMap={onSelectHotel ? () => onSelectHotel(hotelAnchor.id) : undefined}
            />
          )}
          {isEmpty && (
            <div
              className={cn(
                'flex items-center justify-center h-10 rounded border border-dashed text-xs text-muted-foreground/50',
                isOver ? 'border-accent-foreground/30' : 'border-border'
              )}
            >
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
