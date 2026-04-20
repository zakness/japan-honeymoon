import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { TIME_SLOT_ICONS } from '@/lib/time-slot-icons'
import { ItineraryItem } from './ItineraryItem'
import { TransportItem } from './TransportItem'
import { FlightEventCard } from './FlightEventCard'
import { type TimeSlot } from '@/types/itinerary'
import { type Journey, type SlotItem } from '@/types/transport'
import type { PlaceRow } from '@/types/places'
import type { FlightEvent } from '@/lib/logistics-utils'
import { slotItemId } from '@/lib/transport-utils'
import { cn } from '@/lib/utils'

interface TimeSlotGroupProps {
  slot: TimeSlot
  label: string
  items: SlotItem[]
  dayDate: string
  flightEvents?: FlightEvent[]
  /** Fires when the user clicks a scheduled place's name — routed up to AppShell. */
  onSelectPlace?: (place: PlaceRow) => void
  /** Fires when the user clicks a transport card's title — routed up to AppShell. */
  onSelectJourney?: (journey: Journey) => void
  /** Fires when the user clicks the "+ Add" zone at the bottom of the slot. */
  onAddClick?: (slot: TimeSlot) => void
}

export function TimeSlotGroup({
  slot,
  label,
  items,
  dayDate,
  flightEvents = [],
  onSelectPlace,
  onSelectJourney,
  onAddClick,
}: TimeSlotGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${dayDate}-${slot}` })
  const SlotIcon = TIME_SLOT_ICONS[slot]

  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        <SlotIcon className="h-3.5 w-3.5" />
        {label}
      </h3>
      <SortableContext items={items.map(slotItemId)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'space-y-1.5 min-h-[52px] rounded-lg transition-colors p-1',
            isOver ? 'bg-accent/50 ring-1 ring-accent' : ''
          )}
        >
          {flightEvents.map((event) => (
            <FlightEventCard key={event.id} event={event} />
          ))}
          {items.map((item) =>
            item.kind === 'itinerary' ? (
              <ItineraryItem
                key={item.data.id}
                item={item.data}
                dayDate={dayDate}
                onSelectPlace={onSelectPlace}
              />
            ) : (
              <TransportItem
                key={item.data.parent.id}
                journey={item.data}
                dayDate={dayDate}
                onSelect={onSelectJourney}
              />
            )
          )}
          {/*
            "+ Add" zone — always the last child of the droppable container, so
            it acts as both the click target for opening the add dialog (pre-
            selecting this slot) and the visual focal point for drop-over
            feedback. The actual drop target is still the whole slot container
            above; this zone mirrors the `isOver` state so the affordance is
            obvious whether or not the slot has existing items.
          */}
          <button
            type="button"
            onClick={() => onAddClick?.(slot)}
            aria-label={`Add to ${label.toLowerCase()}`}
            className={cn(
              'flex w-full items-center justify-center gap-1 h-10 rounded border border-dashed text-xs transition-colors',
              isOver
                ? 'border-solid border-accent-foreground/40 text-accent-foreground ring-1 ring-accent'
                : 'border-border text-muted-foreground/60 hover:text-foreground hover:border-muted-foreground/40'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isOver ? 'Drop to add' : 'Add'}</span>
          </button>
        </div>
      </SortableContext>
    </div>
  )
}
