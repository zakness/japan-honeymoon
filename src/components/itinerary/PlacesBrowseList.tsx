import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceCard } from '@/components/places/PlaceCard'
import { NestDropZone, useIsNestTarget } from '@/components/places/NestDropZone'
import { useUnscheduledPlaces, useScheduledDatesByPlace } from '@/hooks/useItinerary'
import { usePlaces, useChildCounts, useChildMustGoMap } from '@/hooks/usePlaces'
import { cn } from '@/lib/utils'
import { type City } from '@/config/trip'
import type { PlaceRow, PlaceCategory } from '@/types/places'
import { PLACE_CATEGORIES } from '@/types/places'
import type { SelectPlaceHandler, SelectionOrigin } from '@/components/layout/AppShell'

export type PlaceView = 'all' | 'unscheduled' | 'starred' | 'archived'

interface PlacesBrowseListProps {
  city: City
  onSelectPlace: SelectPlaceHandler
  selectedPlace: PlaceRow | null
  selectionOrigin: SelectionOrigin | null
  /**
   * When true (default), each card is wrapped in a `useDraggable` for the
   * desktop backlog DnD. Must be false in surfaces outside the `DndContext`
   * (e.g. the mobile `PlacesSheet`, which portals to body) to avoid orphan
   * dnd-kit registrations.
   */
  enableDrag?: boolean
}

/**
 * Body of the backlog browse: segmented control + category icons + search +
 * scrollable place list. Shared by:
 *
 *   • Desktop `UnscheduledColumn` (sticky left rail inside the itinerary view).
 *   • Mobile `PlacesSheet` Browse tab (renders without drag support).
 */
export function PlacesBrowseList({
  city,
  onSelectPlace,
  selectedPlace,
  selectionOrigin,
  enableDrag = true,
}: PlacesBrowseListProps) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<PlaceView>('unscheduled')
  const [categoryFilter, setCategoryFilter] = useState<Set<PlaceCategory>>(new Set())

  const { data: allUnscheduled = [] } = useUnscheduledPlaces()
  const { data: allPlaces = [] } = usePlaces()
  const { data: archivedPlaces = [] } = usePlaces({ includeArchived: 'only' })
  const { data: scheduleMap } = useScheduledDatesByPlace()
  const { data: childCounts } = useChildCounts()
  const { data: childMustGoSet } = useChildMustGoMap()

  const toggleCategory = useCallback((cat: PlaceCategory) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const places = useMemo(() => {
    const base =
      view === 'unscheduled'
        ? allUnscheduled
        : view === 'archived'
          ? archivedPlaces
          : view === 'starred'
            ? allPlaces.filter(
                (p) => p.priority === 'must_go' || (childMustGoSet?.has(p.id) ?? false)
              )
            : [...allPlaces, ...archivedPlaces]

    const filtered = base.filter((p) => {
      if (p.city !== city) return false
      if (categoryFilter.size > 0 && !categoryFilter.has(p.category as PlaceCategory)) return false
      if (search) {
        const q = search.trim().toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !(p.notes?.toLowerCase().includes(q) ?? false))
          return false
      }
      return true
    })

    if (view === 'starred' || view === 'archived') return filtered
    return [...filtered].sort((a, b) => {
      const aMust = a.priority === 'must_go' ? 0 : 1
      const bMust = b.priority === 'must_go' ? 0 : 1
      return aMust - bMust
    })
  }, [
    allUnscheduled,
    allPlaces,
    archivedPlaces,
    view,
    city,
    search,
    categoryFilter,
    childMustGoSet,
  ])

  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const selectedId = selectedPlace?.id ?? null
  useEffect(() => {
    if (!selectedId || selectionOrigin === 'backlog') return
    const el = cardRefs.current.get(selectedId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedId, selectionOrigin])

  const Card = enableDrag ? DraggablePlaceCard : PlainPlaceCard

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-2 pt-2 shrink-0">
        <Tabs value={view} onValueChange={(v) => setView(v as PlaceView)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="text-[11px]">
              All
            </TabsTrigger>
            <TabsTrigger value="unscheduled" className="text-[11px]">
              Unsched
            </TabsTrigger>
            <TabsTrigger value="starred" className="text-[11px]">
              Must go
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-[11px]">
              Archived
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-2 pt-2 shrink-0">
        <div className="flex flex-wrap gap-1">
          {PLACE_CATEGORIES.map((cat) => {
            const active = categoryFilter.has(cat.value)
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={cn(
                  'rounded-full border px-1.5 py-0.5 text-sm leading-none transition-all',
                  active
                    ? 'bg-secondary border-border ring-1 ring-ring/30'
                    : 'bg-transparent border-transparent hover:bg-muted/50'
                )}
                title={cat.label}
              >
                <cat.icon size={14} />
              </button>
            )
          })}
        </div>
      </div>

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

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 min-h-0">
        {places.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {search || categoryFilter.size > 0
              ? 'No matches'
              : view === 'archived'
                ? 'Nothing archived yet'
                : view === 'starred'
                  ? 'No starred places yet'
                  : view === 'unscheduled'
                    ? 'All places are scheduled'
                    : 'No places for this city'}
          </p>
        ) : (
          places.map((place) => (
            <Card
              key={place.id}
              place={place}
              selected={selectedPlace?.id === place.id}
              onClick={() => onSelectPlace(place, 'backlog')}
              cardRef={(node: HTMLDivElement | null) => {
                if (node) cardRefs.current.set(place.id, node)
                else cardRefs.current.delete(place.id)
              }}
              scheduledDates={scheduleMap?.get(place.id)}
              childCount={childCounts?.get(place.id) ?? 0}
            />
          ))
        )}
      </div>

      <div className="px-3 py-1.5 border-t shrink-0 text-[11px] text-muted-foreground text-center">
        {places.length} {places.length === 1 ? 'place' : 'places'}
      </div>
    </div>
  )
}

interface CardProps {
  place: PlaceRow
  selected: boolean
  onClick: () => void
  cardRef?: React.Ref<HTMLDivElement>
  scheduledDates?: string[]
  childCount?: number
}

function DraggablePlaceCard({
  place,
  selected,
  onClick,
  cardRef,
  scheduledDates,
  childCount,
}: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled-${place.id}`,
    data: { place },
  })
  const isNestTarget = useIsNestTarget(place.id)

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
      className={cn('relative rounded-lg overflow-hidden', isDragging && 'opacity-50')}
      {...listeners}
      {...attributes}
    >
      <PlaceCard
        place={place}
        compact
        selected={selected}
        onClick={onClick}
        scheduledDates={scheduledDates}
        childCount={childCount}
      />
      <NestDropZone placeId={place.id} />
      {isNestTarget && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-white/30" />
      )}
    </div>
  )
}

function PlainPlaceCard({
  place,
  selected,
  onClick,
  cardRef,
  scheduledDates,
  childCount,
}: CardProps) {
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof cardRef === 'function') cardRef(node)
      else if (cardRef && 'current' in cardRef)
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [cardRef]
  )
  return (
    <div ref={setRef} className="relative rounded-lg overflow-hidden">
      <PlaceCard
        place={place}
        compact
        selected={selected}
        onClick={onClick}
        scheduledDates={scheduledDates}
        childCount={childCount}
      />
    </div>
  )
}
