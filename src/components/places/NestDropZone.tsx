import { useDndContext, useDroppable } from '@dnd-kit/core'
import type { PlaceRow } from '@/types/places'

interface NestDropZoneProps {
  /** Target place id. Dragging another place onto this zone will nest it. */
  placeId: string
}

/**
 * Invisible drop target that nests the dragged place under `placeId`. Covers
 * the whole card (`inset-0`) so the cursor is always over the nest droppable
 * while it's inside the card — there's no edge sliver that would let the
 * underlying sortable win collision. Reorder is handled by explicit
 * `ReorderGap` droppables between cards, not by hovering card edges.
 *
 * Always mounted AND always enabled (except when this card is the drag
 * source). Originally we disabled the droppable while no drag was active,
 * but `MeasuringStrategy.BeforeDragging` skips disabled droppables during its
 * snapshot pass — when the drag then enabled them mid-drag, their rects had
 * never been recorded and `pointerWithin` couldn't see them, so the card
 * sortable underneath kept winning collision.
 *
 * Self-target is gated via `disabled` instead of removing the droppable, so
 * the rect stays in dnd-kit's measured map for the next drag.
 */
export function NestDropZone({ placeId }: NestDropZoneProps) {
  const { active } = useDndContext()
  const draggedPlaceId = getDraggedPlaceId(active)
  const isSelf = draggedPlaceId === placeId
  const { setNodeRef } = useDroppable({
    id: `nest-${placeId}`,
    disabled: isSelf,
  })

  return <div ref={setNodeRef} aria-hidden className="pointer-events-none absolute inset-0 z-10" />
}

/**
 * Read whether the dnd-kit `over` target is the nest droppable for `placeId`.
 * Cards consume this to apply their nest-highlight class.
 */
export function useIsNestTarget(placeId: string | undefined): boolean {
  const { over } = useDndContext()
  if (!placeId) return false
  return over?.id === `nest-${placeId}`
}

/** Resolve the place id of the active drag, or null if it's not a place. */
function getDraggedPlaceId(active: ReturnType<typeof useDndContext>['active']): string | null {
  if (!active) return null
  const id = String(active.id)
  if (id.startsWith('unscheduled-')) return id.slice('unscheduled-'.length)
  const data = active.data.current as { placeId?: string; place?: PlaceRow } | undefined
  if (data?.placeId) return data.placeId
  if (data?.place?.id) return data.place.id
  return null
}
