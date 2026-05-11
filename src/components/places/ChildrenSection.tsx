import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useChildCounts,
  useChildrenOf,
  useNestPlace,
  usePlaces,
  useReorderChildren,
  useUnnestPlace,
} from '@/hooks/usePlaces'
import type { PlaceRow } from '@/types/places'
import { PlaceCard } from './PlaceCard'
import { NestPicker } from './NestPicker'

interface ChildrenSectionProps {
  parent: PlaceRow
  /** Called when a child card body is tapped — re-routes selection through AppShell. */
  onSelectChild?: (child: PlaceRow) => void
}

/**
 * "Children" section rendered inside a parent place's DetailPanel. Lists
 * nested children as a responsive grid of `PlaceCard`s with drag-reorder, a
 * hover-reveal un-nest action per card, and a "+ Add child" picker. Only ever
 * rendered for top-level places (the parent detail caller guards on
 * `parent_place_id == null`).
 */
export function ChildrenSection({ parent, onSelectChild }: ChildrenSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: children = [] } = useChildrenOf(parent.id)
  const { data: allPlaces = [] } = usePlaces()
  const { data: childCounts } = useChildCounts()
  const nest = useNestPlace()
  const unnest = useUnnestPlace()
  const reorder = useReorderChildren()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Candidates: top-level places excluding the parent itself and any place
  // that already has children of its own (the one-level invariant — a parent
  // cannot be demoted to a child).
  const candidates = useMemo(() => {
    return allPlaces.filter((p) => {
      if (p.id === parent.id) return false
      if (p.priority === 'archived') return false
      if ((childCounts?.get(p.id) ?? 0) > 0) return false
      if (parent.city && p.city && p.city !== parent.city) return false
      return true
    })
  }, [allPlaces, parent.id, parent.city, childCounts])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = children.findIndex((c) => c.id === active.id)
    const newIndex = children.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(children, oldIndex, newIndex)
    reorder.mutate({
      parentId: parent.id,
      orderedChildIds: reordered.map((c) => c.id),
    })
  }

  async function handleAddChild(p: PlaceRow) {
    setPickerOpen(false)
    try {
      await nest.mutateAsync({ childId: p.id, parentId: parent.id })
      toast.success(`Added ${p.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add place'
      toast.error(msg)
    }
  }

  async function handleUnnest(child: PlaceRow) {
    try {
      await unnest.mutateAsync(child.id)
      toast.success(`Removed ${child.name}`)
    } catch {
      toast.error('Failed to remove')
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {children.length === 0 ? 'Places' : `Places · ${children.length}`}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add place
        </Button>
      </div>

      {children.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center">
          No places added yet
        </p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={children.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {children.map((child) => (
                <SortableChildCard
                  key={child.id}
                  child={child}
                  onSelect={() => onSelectChild?.(child)}
                  onUnnest={() => handleUnnest(child)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <NestPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Add a place"
        candidates={candidates}
        onSelect={handleAddChild}
        emptyLabel="No eligible places — every other place is already added somewhere, has places of its own, or is archived."
      />
    </div>
  )
}

interface SortableChildCardProps {
  child: PlaceRow
  onSelect: () => void
  onUnnest: () => void
}

function SortableChildCard({ child, onSelect, onUnnest }: SortableChildCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
      }}
      className={cn(isDragging && 'opacity-50')}
      {...attributes}
      {...listeners}
    >
      <PlaceCard place={child} compact onClick={onSelect} onUnnest={onUnnest} />
    </div>
  )
}
