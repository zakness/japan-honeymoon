import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { TIME_SLOT_ICONS } from '@/lib/time-slot-icons'
import { ItineraryItem } from './ItineraryItem'
import { TransportItem } from './TransportItem'
import { FlightEventCard } from './FlightEventCard'
import { ReorderGap } from './ReorderGap'
import { type TimeSlot, type TimeSlotKind } from '@/types/itinerary'
import { type Journey, type SlotItem } from '@/types/transport'
import type { PlaceRow } from '@/types/places'
import type { FlightEvent } from '@/lib/logistics-utils'
import { slotItemId } from '@/lib/transport-utils'
import { cn } from '@/lib/utils'

/**
 * Wraps `verticalListSortingStrategy` so it produces no transforms when the
 * drag's `over` target isn't another sortable in this list. Without this
 * guard, hovering a non-sortable droppable (a `nest-*` or `reorder-*` zone)
 * lands `overIndex = -1`, which the default strategy interprets as "shift all
 * items below the active downward" — a stray jump that we never want.
 */
const safeVerticalListSortingStrategy: SortingStrategy = (args) => {
  if (args.overIndex < 0) return null
  return verticalListSortingStrategy(args)
}

interface TimeSlotGroupProps {
  slot: TimeSlot
  label: string
  /** Whether this slot is a meal anchor (`breakfast`/`lunch`/`dinner`) or one
   *  of the gap slots between meals. Drives the typographic distinction in
   *  the slot header — meal headers read heavier than gap headers. */
  kind: TimeSlotKind
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
  kind,
  items,
  dayDate,
  flightEvents = [],
  onSelectPlace,
  onSelectJourney,
  onAddClick,
}: TimeSlotGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${dayDate}-${slot}` })
  const SlotIcon = TIME_SLOT_ICONS[slot]
  const isEmpty = items.length === 0 && flightEvents.length === 0

  // Compact-when-empty: render a single ~24px row instead of full header +
  // droppable + Add button. Still wired as the slot's droppable + click
  // target so DnD drops and `+ Add` clicks both work.
  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex items-center gap-1.5 h-6 px-2 rounded-md border border-dashed cursor-pointer transition-colors text-xs',
          isOver
            ? 'border-solid border-accent-foreground/40 bg-accent/50 text-accent-foreground ring-1 ring-accent'
            : 'border-border/60 text-muted-foreground/60 hover:text-foreground hover:border-muted-foreground/40'
        )}
        onClick={() => onAddClick?.(slot)}
        role="button"
        aria-label={`Add to ${label.toLowerCase()}`}
      >
        <SlotIcon className="h-3 w-3 shrink-0" />
        <span className={cn('flex-1 truncate', kind === 'meal' ? 'font-medium' : 'font-normal')}>
          {label}
        </span>
        <Plus className="h-3 w-3 shrink-0 opacity-60" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <h3
        className={cn(
          'flex items-center gap-1 text-xs uppercase tracking-wider px-1',
          kind === 'meal' ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
        )}
      >
        <SlotIcon className="h-3.5 w-3.5" />
        {label}
      </h3>
      <SortableContext items={items.map(slotItemId)} strategy={safeVerticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[52px] rounded-lg transition-colors p-1 space-y-1',
            isOver ? 'bg-accent/50 ring-1 ring-accent' : ''
          )}
        >
          {flightEvents.map((event) => (
            <FlightEventCard key={event.id} event={event} />
          ))}
          {/* Explicit gap droppables between every card (and one above the
              first / below the last) carry reorder semantics. The card body
              is reserved for `nest-*` drops — see `NestDropZone`. */}
          {items.map((item, i) => (
            <Fragment key={slotItemId(item)}>
              <ReorderGap dayDate={dayDate} slot={slot} index={i} />
              {item.kind === 'itinerary' ? (
                <ItineraryItem item={item.data} dayDate={dayDate} onSelectPlace={onSelectPlace} />
              ) : (
                <TransportItem journey={item.data} dayDate={dayDate} onSelect={onSelectJourney} />
              )}
            </Fragment>
          ))}
          {items.length > 0 && <ReorderGap dayDate={dayDate} slot={slot} index={items.length} />}
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
