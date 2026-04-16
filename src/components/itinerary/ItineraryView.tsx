import { useCallback, useState, useRef, useEffect } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { ItineraryItem } from '@/components/day/ItineraryItem'
import { TransportItem } from '@/components/day/TransportItem'
import { PlaceCard } from '@/components/places/PlaceCard'
import { cn } from '@/lib/utils'
import type { NavState, SelectionOrigin, SelectPlaceHandler } from '@/components/layout/AppShell'
import { getDaysForCity, type City, type TripDay } from '@/config/trip'
import { useCrossItineraryDnD } from '@/hooks/useCrossItineraryDnD'
import type { PlaceRow } from '@/types/places'
import { CityStrip } from './CityStrip'
import { CityMap } from './CityMap'
import { PlaceDetailCard } from './PlaceDetailCard'
import { DayColumn } from './DayColumn'
import { UnscheduledColumn } from './UnscheduledColumn'

interface ItineraryViewProps {
  city: City
  onNavigate: (state: NavState) => void
  /** Desktop map visibility — controlled by AppShell so the toggle can live in the top nav. */
  mapVisible?: boolean
  /** Unified place selection — null when nothing is selected. Owned by AppShell. */
  selectedPlace: PlaceRow | null
  /** Where the current selection originated (see AppShell for rationale). */
  selectionOrigin: SelectionOrigin | null
  /** Unified selection handler — routes clicks from backlog / marker / day-column. */
  onSelectPlace: SelectPlaceHandler
  /** Opens the edit dialog at AppShell level for a given place. */
  onEditPlace: (place: PlaceRow) => void
}

/**
 * Tracks whether the viewport matches the `sm` breakpoint. Used to render the
 * desktop layout OR the mobile layout — never both. Rendering both branches
 * duplicates every `useDraggable`/`useSortable` hook in the tree, which causes
 * the second registration to overwrite the first in dnd-kit's `draggableNodes`
 * Map. When the "winning" instance lives in the hidden (`display: none`)
 * branch, dnd-kit measures a 0×0 rect for the active node and the DragOverlay
 * is positioned at (0, 0).
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 640px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

// Golden ratio split — itinerary takes the larger share (≈61.8%), map the
// smaller (≈38.2%). 100 / φ ≈ 61.8034.
const GOLDEN_RATIO_SPLIT = 61.8034

export function ItineraryView({
  city,
  onNavigate,
  mapVisible = true,
  selectedPlace,
  selectionOrigin,
  onSelectPlace,
  onEditPlace,
}: ItineraryViewProps) {
  const [splitPercent, setSplitPercent] = useState(GOLDEN_RATIO_SPLIT)
  const [isResizing, setIsResizing] = useState(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const cityDays: TripDay[] = getDaysForCity(city)
  const { sensors, activeDrag, handleDragStart, handleDragEnd } = useCrossItineraryDnD(cityDays)

  function handleSelectCity(nextCity: City) {
    onNavigate({ view: 'itinerary', city: nextCity })
  }

  function handleDividerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsResizing(true)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }

  function handleDividerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isResizing || !splitContainerRef.current) return
    const rect = splitContainerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setSplitPercent(Math.min(80, Math.max(20, pct)))
  }

  function handleDividerPointerUp() {
    setIsResizing(false)
  }

  // Day-column clicks route through the unified handler with `'day-column'`
  // origin baked in. Memoized so DayColumn's effect deps stay stable.
  const handleSelectFromDayColumn = useCallback(
    (place: PlaceRow) => onSelectPlace(place, 'day-column'),
    [onSelectPlace]
  )

  const itineraryPanel = (
    <>
      <UnscheduledColumn
        city={city}
        onSelectPlace={onSelectPlace}
        selectedPlace={selectedPlace}
        selectionOrigin={selectionOrigin}
      />
      <div className="flex overflow-x-auto">
        {cityDays.map((day) => (
          <DayColumn key={day.date} dayDate={day.date} onSelectPlace={handleSelectFromDayColumn} />
        ))}
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-full">
      {/* CityStrip on desktop now lives in AppShell's top nav; the mobile strip
          still lives inside the bottom sheet below. */}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {isDesktop ? (
          /* ── Desktop layout ─────────────────────────────────────────────── */
          <div
            ref={splitContainerRef}
            className={cn('flex flex-1 overflow-hidden', isResizing && 'select-none')}
          >
            {/* Itinerary panel */}
            <div
              className={cn('flex overflow-hidden shrink-0', mapVisible && 'border-r')}
              style={{ width: mapVisible ? `${splitPercent}%` : '100%' }}
            >
              {itineraryPanel}
            </div>

            {mapVisible && (
              <>
                {/* Resize divider — 12px hit area with a 4px visible bar centered inside.
                    Negative horizontal margin lets the hit area overlap the adjacent
                    panels without changing their layout widths. */}
                <div
                  className="w-3 -mx-1 shrink-0 cursor-col-resize relative z-10 flex items-center justify-center group/divider"
                  onPointerDown={handleDividerPointerDown}
                  onPointerMove={handleDividerPointerMove}
                  onPointerUp={handleDividerPointerUp}
                >
                  <div
                    className={cn(
                      'w-1 h-full transition-colors',
                      isResizing ? 'bg-primary/40' : 'group-hover/divider:bg-primary/20'
                    )}
                  />
                </div>

                {/* Map panel */}
                <div className={cn('flex-1 overflow-hidden', isResizing && 'pointer-events-none')}>
                  <CityMap
                    city={city}
                    selectedPlace={selectedPlace}
                    onSelectPlace={onSelectPlace}
                    onEditPlace={onEditPlace}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Mobile layout ──────────────────────────────────────────────── */
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0">
              <CityMap
                city={city}
                selectedPlace={selectedPlace}
                onSelectPlace={onSelectPlace}
                onEditPlace={onEditPlace}
              />
            </div>

            {selectedPlace ? (
              /* Place detail sheet — replaces the day-columns sheet while a
                 place is selected. The itinerary sheet collapses to an 80px
                 peek handle underneath so the user can tap it to dismiss. */
              <>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col"
                  style={{ height: '50vh' }}
                >
                  <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
                    <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex-1 overflow-hidden px-1">
                    <PlaceDetailCard
                      place={selectedPlace}
                      onClose={() => onSelectPlace(null)}
                      onEdit={() => onEditPlace(selectedPlace)}
                      variant="sheet"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Default itinerary sheet */
              <div
                className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col"
                style={{ height: '58vh' }}
              >
                <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
                  <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <CityStrip selectedCity={city} onSelectCity={handleSelectCity} />
                <div className="flex flex-1 overflow-hidden">{itineraryPanel}</div>
              </div>
            )}
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          {activeDrag?.type === 'slot' && (
            <div className="opacity-90 shadow-lg w-60">
              {activeDrag.item.kind === 'itinerary' ? (
                <ItineraryItem item={activeDrag.item.data} dayDate="" />
              ) : (
                <TransportItem item={activeDrag.item.data} dayDate="" />
              )}
            </div>
          )}
          {activeDrag?.type === 'place' && (
            <div className="w-52 opacity-90 shadow-lg">
              <PlaceCard place={activeDrag.place} compact />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
