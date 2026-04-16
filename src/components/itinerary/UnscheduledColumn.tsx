import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceCard } from '@/components/places/PlaceCard'
import { PlaceForm } from '@/components/places/PlaceForm'
import { useUnscheduledPlaces, useScheduledDatesByPlace } from '@/hooks/useItinerary'
import { usePlaces } from '@/hooks/usePlaces'
import { type City } from '@/config/trip'
import type { PlaceRow } from '@/types/places'
import type { SelectPlaceHandler, SelectionOrigin } from '@/components/layout/AppShell'

type PlaceFilter = 'all' | 'unscheduled' | 'scheduled'

interface DraggablePlaceCardProps {
  place: PlaceRow
  selected: boolean
  onClick: () => void
  cardRef?: React.Ref<HTMLDivElement>
  scheduledDates?: string[]
}

function DraggablePlaceCard({
  place,
  selected,
  onClick,
  cardRef,
  scheduledDates,
}: DraggablePlaceCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled-${place.id}`,
    data: { place },
  })

  // Merge the dnd-kit ref with the scroll-target ref
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      if (typeof cardRef === 'function') cardRef(node)
      else if (cardRef && 'current' in cardRef)
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [setNodeRef, cardRef]
  )

  return (
    <div
      ref={mergedRef}
      className={isDragging ? 'opacity-50' : undefined}
      {...listeners}
      {...attributes}
    >
      <PlaceCard
        place={place}
        compact
        selected={selected}
        onClick={onClick}
        scheduledDates={scheduledDates}
      />
    </div>
  )
}

interface UnscheduledColumnProps {
  city: City
  /** Unified selection handler — routes clicks into AppShell's lifted state. */
  onSelectPlace: SelectPlaceHandler
  /** Currently-selected place (or null). Used for card highlight. */
  selectedPlace: PlaceRow | null
  /** Where the current selection originated — used for the auto-scroll skip rule. */
  selectionOrigin: SelectionOrigin | null
}

export function UnscheduledColumn({
  city,
  onSelectPlace,
  selectedPlace,
  selectionOrigin,
}: UnscheduledColumnProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [addPlaceOpen, setAddPlaceOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PlaceFilter>('unscheduled')

  const { data: allUnscheduled = [] } = useUnscheduledPlaces()
  const { data: allPlaces = [] } = usePlaces()
  const { data: scheduleMap } = useScheduledDatesByPlace()

  const places = useMemo(() => {
    // Pick base list based on filter
    const base =
      filter === 'unscheduled'
        ? allUnscheduled
        : filter === 'scheduled'
          ? allPlaces.filter((p) => scheduleMap?.has(p.id))
          : allPlaces

    // Apply city + search filters
    const cityPlaces = base.filter((p) => p.city === city)
    const q = search.trim().toLowerCase()
    if (!q) return cityPlaces
    return cityPlaces.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.notes?.toLowerCase().includes(q) ?? false)
    )
  }, [allUnscheduled, allPlaces, scheduleMap, filter, city, search])

  // Per-card refs for auto-scroll.
  const cardRefs = useRef(new Map<string, HTMLDivElement>())

  // When a place is selected from the map marker or day-column, scroll the
  // matching backlog card into view. Skip when the user clicked the backlog
  // card itself — they already know where it is.
  const selectedId = selectedPlace?.id ?? null
  useEffect(() => {
    if (!selectedId || selectionOrigin === 'backlog') return
    const el = cardRefs.current.get(selectedId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedId, selectionOrigin])

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col border-r sticky left-0 z-10 bg-muted/40 h-full">
        <button
          onClick={() => setCollapsed(false)}
          className="flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Expand places"
        >
          <span
            className="text-xs font-medium"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Places {places.length > 0 ? `(${places.length})` : ''}
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
      <div className="w-64 shrink-0 flex flex-col border-r sticky left-0 z-10 bg-muted/40 h-full">
        {/* Header */}
        <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              Places
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
              {places.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setAddPlaceOpen(true)}
              className="h-6 w-6 rounded-full bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center"
              title="Add place"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="size-7 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
              title="Collapse"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="px-2 pt-2 shrink-0">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as PlaceFilter)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="unscheduled" className="text-xs">
                Unsched
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs">
                Sched
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <div className="px-2 pt-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="h-8 pl-7 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Place list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          {places.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {search
                ? 'No matches'
                : filter === 'unscheduled'
                  ? 'All places are scheduled'
                  : filter === 'scheduled'
                    ? 'No scheduled places'
                    : 'No places for this city'}
            </p>
          ) : (
            places.map((place) => (
              <DraggablePlaceCard
                key={place.id}
                place={place}
                selected={selectedPlace?.id === place.id}
                onClick={() => onSelectPlace(place, 'backlog')}
                cardRef={(node: HTMLDivElement | null) => {
                  if (node) cardRefs.current.set(place.id, node)
                  else cardRefs.current.delete(place.id)
                }}
                scheduledDates={scheduleMap?.get(place.id)}
              />
            ))
          )}
        </div>
      </div>

      <Dialog open={addPlaceOpen} onOpenChange={setAddPlaceOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add place</DialogTitle>
          </DialogHeader>
          <PlaceForm
            defaultCity={city}
            onSuccess={() => setAddPlaceOpen(false)}
            onCancel={() => setAddPlaceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
