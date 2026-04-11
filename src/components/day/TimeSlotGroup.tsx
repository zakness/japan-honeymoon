import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ItineraryItem } from './ItineraryItem'
import { type TimeSlot, type ItineraryItemWithPlace } from '@/types/itinerary'
import { cn } from '@/lib/utils'

interface TimeSlotGroupProps {
  slot: TimeSlot
  label: string
  items: ItineraryItemWithPlace[]
  dayDate: string
  onSelectPlace?: (placeId: string) => void
}

export function TimeSlotGroup({ slot, label, items, dayDate, onSelectPlace }: TimeSlotGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slot}` })

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {label}
      </h3>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'space-y-1.5 min-h-[52px] rounded-lg transition-colors p-1',
            isOver ? 'bg-accent/50 ring-1 ring-accent' : ''
          )}
        >
          {items.map((item) => (
            <ItineraryItem
              key={item.id}
              item={item}
              dayDate={dayDate}
              onSelectPlace={onSelectPlace}
            />
          ))}
          {items.length === 0 && (
            <div className={cn(
              'flex items-center justify-center h-10 rounded border border-dashed text-xs text-muted-foreground/50',
              isOver ? 'border-accent-foreground/30' : 'border-border'
            )}>
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
