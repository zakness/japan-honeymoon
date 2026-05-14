import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core'
import { ItineraryItem } from '@/components/day/ItineraryItem'
import { TransportItem } from '@/components/day/TransportItem'
import { PlaceCard } from '@/components/places/PlaceCard'
import { cn } from '@/lib/utils'
import type { NavState, SelectionOrigin, SelectPlaceHandler } from '@/components/layout/AppShell'
import { getDaysForCity, type City, type TripDay } from '@/config/trip'
import { useCrossItineraryDnD } from '@/hooks/useCrossItineraryDnD'
import { DndDebugOverlay } from './DndDebugOverlay'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'
import { CityStrip } from './CityStrip'
import { CityMap } from './CityMap'
import { DetailPanel, type DetailSelection } from './DetailPanel'
import { DayColumn } from './DayColumn'
import { UnscheduledColumn } from './UnscheduledColumn'
import { DayStrip, PLACES_TAB, type DayTabValue } from './DayStrip'

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
  /** Lifted hotel selection — owned by AppShell. */
  selectedHotel: AccommodationRow | null
  /** Lifted hotel selection handler — enforces place/hotel mutual exclusion. */
  onSelectHotel: (hotel: AccommodationRow | null) => void
  /** Opens the edit dialog at AppShell level for a given hotel. */
  onEditHotel: (hotel: AccommodationRow) => void
  /** Lifted journey selection — owned by AppShell. */
  selectedJourney: Journey | null
  /** Journey selection handler — enforces three-way mutual exclusion. */
  onSelectJourney: (journey: Journey | null) => void
  /** Opens the transport edit dialog at AppShell level. */
  onEditJourney: (journey: Journey) => void
}

// Golden ratio split — itinerary takes the larger share (≈61.8%), map the
// smaller (≈38.2%). 100 / φ ≈ 61.8034.
const GOLDEN_RATIO_SPLIT = 61.8034

/**
 * Default vertical split inside the desktop map column when a selection is
 * active: map gets the smaller share (top), detail panel the larger share
 * (bottom). Mirrors the mobile 40/60 split. Persisted in component state and
 * adjustable via a horizontal resize divider; rebased to this default on a
 * fresh selection.
 */
const DETAIL_SPLIT_DEFAULT_PCT = 40
/** Hard min/max for the map share so neither pane can become unusable. */
const DETAIL_SPLIT_MIN_PCT = 20
const DETAIL_SPLIT_MAX_PCT = 80
/** Height transition duration for the desktop detail panel open/close. */
const DETAIL_PANEL_TRANSITION_MS = 180

/** Local-time YYYY-MM-DD ("today" in the user's wall-clock, not UTC). */
function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Cross-slot DnD has to work with both full-size slots (~120px+) and the
 * compact-when-empty rows (~24px). dnd-kit's default `rectIntersection` picks
 * the droppable with the largest overlap, which means the much-larger source
 * slot keeps "winning" over a tiny target row even when the cursor is over it.
 * `pointerWithin` uses the cursor's exact position instead — which is what
 * users intuitively expect ("I'm hovering this slot, drop here"). Fall back to
 * `rectIntersection` if the pointer isn't inside any droppable (e.g. dragging
 * over a gap between slots).
 */
const dndCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  if (pointer.length > 0) {
    // Place-nest droppables (`nest-{placeId}`) sit inside sortable cards. When
    // the cursor is inside the inner zone, prefer nesting over the reorder /
    // slot semantics; the edge slivers around the zone fall through to the
    // sortable so users can still reorder by dropping near the top/bottom.
    const nestHit = pointer.find((c) => String(c.id).startsWith('nest-'))
    if (nestHit) return [nestHit]
    return pointer
  }
  return rectIntersection(args)
}

function pickDefaultDayTab(city: City): DayTabValue {
  const days = getDaysForCity(city)
  const today = localDateString()
  if (days.some((d) => d.date === today)) return today
  return days[0]?.date ?? PLACES_TAB
}

export function ItineraryView({
  city,
  onNavigate,
  mapVisible = true,
  selectedPlace,
  selectionOrigin,
  onSelectPlace,
  onEditPlace,
  selectedHotel,
  onSelectHotel,
  onEditHotel,
  selectedJourney,
  onSelectJourney,
  onEditJourney,
}: ItineraryViewProps) {
  const [splitPercent, setSplitPercent] = useState(GOLDEN_RATIO_SPLIT)
  const [isResizing, setIsResizing] = useState(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  // Vertical split inside the desktop map column when a detail is open.
  // Map gets `mapDetailSplitPct`% on top, detail panel gets the rest. Only
  // applied while a selection is active; collapses to map-only otherwise.
  const [mapDetailSplitPct, setMapDetailSplitPct] = useState<number>(DETAIL_SPLIT_DEFAULT_PCT)
  const [isResizingDetail, setIsResizingDetail] = useState(false)
  const mapColumnRef = useRef<HTMLDivElement>(null)

  // Discriminated selection for the shared DetailPanel. Null when nothing is
  // selected — the panel collapses on desktop, falls back to the itinerary
  // content on mobile.
  const detailSelection: DetailSelection | null = selectedPlace
    ? { kind: 'place', place: selectedPlace }
    : selectedHotel
      ? { kind: 'hotel', hotel: selectedHotel }
      : selectedJourney
        ? { kind: 'journey', journey: selectedJourney }
        : null

  const handleCloseDetail = useCallback(() => {
    if (selectedPlace) onSelectPlace(null)
    else if (selectedHotel) onSelectHotel(null)
    else if (selectedJourney) onSelectJourney(null)
  }, [selectedPlace, selectedHotel, selectedJourney, onSelectPlace, onSelectHotel, onSelectJourney])

  const handleEditDetail = useCallback(() => {
    if (selectedPlace) onEditPlace(selectedPlace)
    else if (selectedHotel) onEditHotel(selectedHotel)
    else if (selectedJourney) onEditJourney(selectedJourney)
  }, [selectedPlace, selectedHotel, selectedJourney, onEditPlace, onEditHotel, onEditJourney])

  const cityDays: TripDay[] = useMemo(() => getDaysForCity(city), [city])
  const { sensors, activeDrag, handleDragStart, handleDragEnd } = useCrossItineraryDnD(cityDays)

  // Mobile day-tab selection. Defaults to today if it falls within the city's
  // day range, else the city's first day. When the city prop changes (e.g. via
  // CityStrip tap), reset to the new city's default — UNLESS the current tab
  // is already a valid day in the new city. Preserving handles the
  // swipe-across-cities case: the swipe handler sets `mobileTab` to the new
  // day AND fires `onNavigate`, which lands here; we want the day kept, not
  // overwritten with the new city's default.
  const [mobileTab, setMobileTab] = useState<DayTabValue>(() => pickDefaultDayTab(city))
  useEffect(() => {
    setMobileTab((prev) => {
      if (prev === PLACES_TAB) return prev
      const days = getDaysForCity(city)
      if (days.some((d) => d.date === prev)) return prev
      return pickDefaultDayTab(city)
    })
  }, [city])

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

  function handleDetailDividerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsResizingDetail(true)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }

  function handleDetailDividerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isResizingDetail || !mapColumnRef.current) return
    const rect = mapColumnRef.current.getBoundingClientRect()
    const pct = ((e.clientY - rect.top) / rect.height) * 100
    setMapDetailSplitPct(Math.min(DETAIL_SPLIT_MAX_PCT, Math.max(DETAIL_SPLIT_MIN_PCT, pct)))
  }

  function handleDetailDividerPointerUp() {
    setIsResizingDetail(false)
  }

  // Day-column clicks route through the unified handler with `'day-column'`
  // origin baked in. Memoized so DayColumn's effect deps stay stable.
  const handleSelectFromDayColumn = useCallback(
    (place: PlaceRow) => onSelectPlace(place, 'day-column'),
    [onSelectPlace]
  )

  // Detail-panel internal navigation (breadcrumb tap → parent, child row tap →
  // child). Use the 'marker' origin so the backlog auto-scrolls the new
  // selection into view — UX expectation when navigating within the group.
  const handleSelectFromDetail = useCallback(
    (place: PlaceRow) => onSelectPlace(place, 'marker'),
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
          <DayColumn
            key={day.date}
            dayDate={day.date}
            onSelectPlace={handleSelectFromDayColumn}
            onSelectHotel={onSelectHotel}
            onEditHotel={onEditHotel}
            onSelectJourney={onSelectJourney}
          />
        ))}
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-full">
      {/* CityStrip on desktop now lives in AppShell's top nav; the mobile strip
          still lives inside the bottom sheet below. */}

      <DndContext
        sensors={sensors}
        collisionDetection={dndCollisionDetection}
        // Lock droppable rects to their pre-drag positions. Without this,
        // dnd-kit re-measures during sortable shift animations, which causes
        // the cursor's hit zone to flip between the card sortable and the
        // nest droppable as a target shifts in/out from under the pointer.
        // Pre-drag geometry keeps `over` stable; the shift animations stay
        // visual and don't feed back into collision detection.
        measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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

                {/* Map + detail panel column.
                    The detail panel sits below the map as a sibling — never
                    overlays it. When a selection is active, the column splits
                    vertically (default 40% map / 60% detail) with a draggable
                    horizontal divider. CityMap's ResizeObserver keeps the
                    active selection centered through the open/close
                    transition AND through user drags. The transition is
                    disabled mid-drag so the detail follows the cursor 1:1. */}
                <div
                  ref={mapColumnRef}
                  className={cn(
                    'flex-1 flex flex-col overflow-hidden',
                    (isResizing || isResizingDetail) && 'pointer-events-none'
                  )}
                >
                  <div
                    className="overflow-hidden min-h-0"
                    style={{
                      height: detailSelection ? `${mapDetailSplitPct}%` : '100%',
                      transition: isResizingDetail
                        ? 'none'
                        : `height ${DETAIL_PANEL_TRANSITION_MS}ms ease-out`,
                    }}
                  >
                    <CityMap
                      city={city}
                      selectedPlace={selectedPlace}
                      onSelectPlace={onSelectPlace}
                      selectedHotel={selectedHotel}
                      onSelectHotel={onSelectHotel}
                      selectedJourney={selectedJourney}
                      onSelectJourney={onSelectJourney}
                    />
                  </div>
                  {detailSelection && (
                    <div
                      className="h-3 -my-1 shrink-0 cursor-row-resize relative z-10 flex items-center justify-center group/detail-divider pointer-events-auto"
                      onPointerDown={handleDetailDividerPointerDown}
                      onPointerMove={handleDetailDividerPointerMove}
                      onPointerUp={handleDetailDividerPointerUp}
                    >
                      <div
                        className={cn(
                          'h-1 w-full transition-colors',
                          isResizingDetail
                            ? 'bg-primary/40'
                            : 'group-hover/detail-divider:bg-primary/20'
                        )}
                      />
                    </div>
                  )}
                  <div
                    className="overflow-hidden border-t bg-background"
                    style={{
                      height: detailSelection ? `${100 - mapDetailSplitPct}%` : 0,
                      transition: isResizingDetail
                        ? 'none'
                        : `height ${DETAIL_PANEL_TRANSITION_MS}ms ease-out`,
                    }}
                  >
                    {detailSelection && (
                      <DetailPanel
                        selection={detailSelection}
                        onClose={handleCloseDetail}
                        onEdit={handleEditDetail}
                        onSelectPlace={handleSelectFromDetail}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Mobile layout ──────────────────────────────────────────────── */
          /* Fixed 30/70 vertical split. Map on top (30dvh), bottom region
             (70dvh) holds the itinerary content by default and swaps to the
             shared DetailPanel when something is selected. The itinerary
             content stays mounted (just hidden) so scroll position survives
             a select+close cycle. No draggable sheet. */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-[30dvh] shrink-0">
              <CityMap
                city={city}
                selectedPlace={selectedPlace}
                onSelectPlace={onSelectPlace}
                selectedHotel={selectedHotel}
                onSelectHotel={onSelectHotel}
                selectedJourney={selectedJourney}
                onSelectJourney={onSelectJourney}
              />
            </div>
            <div className="flex-1 min-h-0 relative bg-background border-t">
              {/* Itinerary content stays mounted to preserve scroll/state;
                  visibility toggles when a detail is open. */}
              <div
                className={cn(
                  'absolute inset-0 flex flex-col',
                  detailSelection && 'invisible pointer-events-none'
                )}
                aria-hidden={detailSelection ? 'true' : undefined}
              >
                <CityStrip selectedCity={city} onSelectCity={handleSelectCity} />
                <DayStrip city={city} selected={mobileTab} onSelect={setMobileTab} />
                {mobileTab === PLACES_TAB ? (
                  <div className="flex-1 overflow-hidden min-h-0">
                    <UnscheduledColumn
                      city={city}
                      onSelectPlace={onSelectPlace}
                      selectedPlace={selectedPlace}
                      selectionOrigin={selectionOrigin}
                      fillWidth
                    />
                  </div>
                ) : (
                  <div className="relative flex-1 overflow-hidden min-h-0 bg-muted/40 px-3 pb-2">
                    <DayColumn
                      key={mobileTab}
                      dayDate={mobileTab}
                      onSelectPlace={handleSelectFromDayColumn}
                      onSelectHotel={onSelectHotel}
                      onEditHotel={onEditHotel}
                      onSelectJourney={onSelectJourney}
                      fillWidth
                    />
                  </div>
                )}
              </div>
              {detailSelection && (
                <div className="absolute inset-0">
                  <DetailPanel
                    selection={detailSelection}
                    onClose={handleCloseDetail}
                    onEdit={handleEditDetail}
                    onSelectPlace={handleSelectFromDetail}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          {activeDrag?.type === 'slot' && (
            <div className="opacity-90 shadow-lg w-64">
              {activeDrag.item.kind === 'itinerary' ? (
                <ItineraryItem item={activeDrag.item.data} dayDate="" />
              ) : (
                <TransportItem journey={activeDrag.item.data} dayDate="" />
              )}
            </div>
          )}
          {activeDrag?.type === 'place' && (
            <div className="w-64 opacity-90 shadow-lg">
              <PlaceCard place={activeDrag.place} compact />
            </div>
          )}
        </DragOverlay>
        <DndDebugOverlay />
      </DndContext>
    </div>
  )
}
