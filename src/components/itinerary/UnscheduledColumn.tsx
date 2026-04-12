import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PlaceCard } from '@/components/places/PlaceCard'
import { PlaceForm } from '@/components/places/PlaceForm'
import { useUnscheduledPlaces } from '@/hooks/useItinerary'
import { type City } from '@/config/trip'
import type { PlaceRow } from '@/types/places'

function DraggablePlaceCard({ place }: { place: PlaceRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unscheduled-${place.id}`,
    data: { place },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? 'opacity-50' : undefined}
      {...listeners}
      {...attributes}
    >
      <PlaceCard place={place} compact />
    </div>
  )
}

interface UnscheduledColumnProps {
  city: City
}

export function UnscheduledColumn({ city }: UnscheduledColumnProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [addPlaceOpen, setAddPlaceOpen] = useState(false)

  const { data: allUnscheduled = [] } = useUnscheduledPlaces()
  const places = allUnscheduled.filter((p) => p.city === city)

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col border-r sticky left-0 z-10 bg-background h-full">
        <button
          onClick={() => setCollapsed(false)}
          className="flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Expand unscheduled"
        >
          <span
            className="text-xs font-medium"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Unscheduled {places.length > 0 ? `(${places.length})` : ''}
          </span>
        </button>
        <div className="flex items-center justify-center pb-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-56 shrink-0 flex flex-col border-r sticky left-0 z-10 bg-background h-full">
        {/* Header */}
        <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              Unscheduled
            </span>
            {places.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
                {places.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Collapse"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Add place button */}
        <div className="px-2 pt-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setAddPlaceOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add place
          </Button>
        </div>

        {/* Place list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          {places.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No unscheduled places</p>
          ) : (
            places.map((place) => <DraggablePlaceCard key={place.id} place={place} />)
          )}
        </div>
      </div>

      <Dialog open={addPlaceOpen} onOpenChange={setAddPlaceOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add place</DialogTitle>
          </DialogHeader>
          <PlaceForm
            onSuccess={() => setAddPlaceOpen(false)}
            onCancel={() => setAddPlaceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
