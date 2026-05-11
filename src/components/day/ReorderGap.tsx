import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/types/itinerary'

interface ReorderGapProps {
  dayDate: string
  slot: TimeSlot
  /** Insertion index inside the slot — 0 = before first item, N = after last. */
  index: number
}

/**
 * Thin horizontal drop target rendered between (and around) sortable cards in
 * a day-column slot. Dropping onto this zone reorders / inserts the dragged
 * item at `index` within the slot. The card body itself is reserved for nest
 * drops, so this is the only place where reorder semantics fire.
 *
 * Visual: 6px hit area, invisible at rest, renders a 2px primary-tinted bar
 * when isOver.
 *
 * Always enabled (no `disabled` gate) so dnd-kit's
 * `MeasuringStrategy.BeforeDragging` records the rect during its snapshot
 * pass — disabled droppables get skipped, and re-enabling mid-drag doesn't
 * give them a rect, so `pointerWithin` would never resolve to them.
 */
export function ReorderGap({ dayDate, slot, index }: ReorderGapProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `reorder-${dayDate}-${slot}-${index}`,
    data: { dayDate, slot, index },
  })

  return (
    <div ref={setNodeRef} aria-hidden className="relative h-1.5">
      <div
        className={cn(
          'absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full transition-colors',
          isOver ? 'bg-primary' : 'bg-transparent'
        )}
      />
    </div>
  )
}
