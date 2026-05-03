import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { ItineraryItem } from '@/components/day/ItineraryItem'
import { TransportItem } from '@/components/day/TransportItem'
import { PlaceCard } from '@/components/places/PlaceCard'
import { cn } from '@/lib/utils'
import type { NavState, SelectionOrigin, SelectPlaceHandler } from '@/components/layout/AppShell'
import { getDaysForCity, TRIP_DAYS, type City, type TripDay } from '@/config/trip'
import { useCrossItineraryDnD } from '@/hooks/useCrossItineraryDnD'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'
import { CityStrip } from './CityStrip'
import { CityMap } from './CityMap'
import { PlaceDetailCard } from './PlaceDetailCard'
import { HotelDetailCard } from './HotelDetailCard'
import { TransportDetailCard } from './TransportDetailCard'
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

/**
 * Default itinerary sheet snap heights as a fraction of viewport height.
 * Collapsed shows the day strip + ~one time slot above the map; expanded
 * approaches fullscreen for focused planning.
 */
const SHEET_SNAP_COLLAPSED_VH = 0.32
const SHEET_SNAP_EXPANDED_VH = 0.85
/** Detail sheet height — golden ratio so the sheet gets the larger share (~62%). */
const DETAIL_SHEET_VH = 1 / 1.618 // ≈ 0.618
/** Desktop detail panel fixed height (px), pushes the map up when a selection is active. */
const DESKTOP_DETAIL_PANEL_PX = 340
/** Height transition duration for the desktop detail panel. */
const DETAIL_PANEL_TRANSITION_MS = 180
type SheetSnap = 'collapsed' | 'expanded'

/**
 * Tracks the current viewport height so we can express the mobile sheet
 * obstruction in CSS pixels (the unit Google Maps' panBy / fitBounds padding
 * expects). Updates on resize / orientation change.
 */
/** Local-time YYYY-MM-DD ("today" in the user's wall-clock, not UTC). */
function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pickDefaultDayTab(city: City): DayTabValue {
  const days = getDaysForCity(city)
  const today = localDateString()
  if (days.some((d) => d.date === today)) return today
  return days[0]?.date ?? PLACES_TAB
}

/** Trip-wide neighbour lookup (crosses city boundaries). */
function getAdjacentDay(date: string, direction: 1 | -1): TripDay | null {
  const idx = TRIP_DAYS.findIndex((d) => d.date === date)
  if (idx === -1) return null
  return TRIP_DAYS[idx + direction] ?? null
}

/** Minimum horizontal travel (px) before a swipe commits to the next day. */
const SWIPE_COMMIT_THRESHOLD_PX = 70
/** Minimum dx before we lock in the swipe gesture and prevent vertical scroll fights. */
const SWIPE_AXIS_LOCK_PX = 8

interface BottomSheetProps {
  collapsedPx: number
  expandedPx: number
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  children: React.ReactNode
}

/**
 * Draggable bottom sheet with two snap points. The grabber at the top of the
 * sheet is the drag surface — pointer events on it follow the finger while
 * the rest of the sheet content scrolls/interacts normally. On release, the
 * sheet snaps to whichever point is closer (or, on a fast flick, in the
 * direction of travel). Hand-rolled to avoid pulling in framer-motion just
 * for one gesture.
 */
function BottomSheet({ collapsedPx, expandedPx, snap, onSnapChange, children }: BottomSheetProps) {
  const targetHeight = snap === 'collapsed' ? collapsedPx : expandedPx
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const startY = useRef<number | null>(null)
  const startHeight = useRef<number>(targetHeight)
  // Snap heights snapshotted at pointerdown so a viewport resize mid-drag
  // (e.g. orientation change) doesn't cause a discontinuity in the clamp.
  const dragCollapsedPx = useRef<number>(collapsedPx)
  const dragExpandedPx = useRef<number>(expandedPx)
  const activePointerId = useRef<number | null>(null)

  function safeRelease(e: React.PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // capture may already be released by the browser; ignore
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (activePointerId.current !== null) return // ignore secondary pointers
    activePointerId.current = e.pointerId
    startY.current = e.clientY
    startHeight.current = targetHeight
    dragCollapsedPx.current = collapsedPx
    dragExpandedPx.current = expandedPx
    setDragHeight(targetHeight)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startY.current === null || e.pointerId !== activePointerId.current) return
    const dy = e.clientY - startY.current
    // Drag down (dy > 0) shrinks the sheet; drag up grows it.
    let next = startHeight.current - dy
    // Soft clamp with a small overshoot region for tactile feel.
    const min = dragCollapsedPx.current * 0.85
    const max = dragExpandedPx.current * 1.05
    if (next < min) next = min - (min - next) * 0.5
    if (next > max) next = max - (next - max) * 0.5
    setDragHeight(next)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current) return
    try {
      if (startY.current !== null && dragHeight !== null) {
        const midpoint = (dragCollapsedPx.current + dragExpandedPx.current) / 2
        onSnapChange(dragHeight > midpoint ? 'expanded' : 'collapsed')
      }
    } finally {
      startY.current = null
      setDragHeight(null)
      activePointerId.current = null
      safeRelease(e)
    }
  }

  const visibleHeight = dragHeight ?? targetHeight

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col"
      style={{
        height: visibleHeight,
        // Animate snap-back; instant follow during drag.
        transition: dragHeight === null ? 'height 240ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
      }}
    >
      <div
        className="flex items-center justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      {children}
    </div>
  )
}

interface DayColumnSwiperProps {
  hasPrev: boolean
  hasNext: boolean
  onSwipePrev: () => void
  onSwipeNext: () => void
  children: React.ReactNode
}

/**
 * Touch-swipe wrapper for the mobile day column. Tracks horizontal pointer
 * travel and either commits (snap to prev/next day) or rubber-bands back on
 * release. `touch-action: pan-y` lets vertical scroll inside the column work
 * normally; we only steal the gesture once horizontal motion exceeds the
 * axis-lock threshold. Floating chevrons indicate when there's a neighbour.
 */
function DayColumnSwiper({
  hasPrev,
  hasNext,
  onSwipePrev,
  onSwipeNext,
  children,
}: DayColumnSwiperProps) {
  const [dragX, setDragX] = useState(0)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const locked = useRef(false)
  // Only one finger drives the swipe at a time; secondary touches are ignored
  // so multi-touch can't wedge the gesture in a half-locked state.
  const activePointerId = useRef<number | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (activePointerId.current !== null) return
    activePointerId.current = e.pointerId
    startX.current = e.clientX
    startY.current = e.clientY
    locked.current = false
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current) return
    if (startX.current === null || startY.current === null) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_AXIS_LOCK_PX) {
        // User is scrolling vertically — bail out of the gesture entirely.
        startX.current = null
        startY.current = null
        activePointerId.current = null
        return
      }
      if (Math.abs(dx) < SWIPE_AXIS_LOCK_PX) return
      locked.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    // Apply rubber-band resistance when swiping into a non-existent neighbour.
    if (dx > 0 && !hasPrev) setDragX(dx * 0.25)
    else if (dx < 0 && !hasNext) setDragX(dx * 0.25)
    else setDragX(dx)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current) return
    try {
      if (startX.current !== null) {
        const dx = e.clientX - startX.current
        if (dx > SWIPE_COMMIT_THRESHOLD_PX && hasPrev) onSwipePrev()
        else if (dx < -SWIPE_COMMIT_THRESHOLD_PX && hasNext) onSwipeNext()
      }
    } finally {
      startX.current = null
      startY.current = null
      locked.current = false
      activePointerId.current = null
      setDragX(0)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // capture may not have been claimed (gesture didn't lock); ignore
      }
    }
  }

  return (
    <div className="relative flex-1 overflow-hidden min-h-0 bg-muted/40 pb-2">
      {/* Peek stubs — narrow vertical slabs at the container edges, styled
          like the side of an off-screen card. Corner radius matches the
          centered card's `rounded-xl` so they read as the same kind of card.
          Top:0 / bottom-2 align them with the card's vertical bounds (the
          card sits flush to the top of this container). */}
      {hasPrev && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-2 w-2 rounded-r-xl border-y border-r bg-background shadow-sm z-10"
          aria-hidden="true"
        />
      )}
      {hasNext && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-2 w-2 rounded-l-xl border-y border-l bg-background shadow-sm z-10"
          aria-hidden="true"
        />
      )}
      <div
        className="h-full px-3"
        style={{
          transform: `translateX(${dragX}px)`,
          // Animate snap-back when dragX returns to 0; instant follow during drag.
          transition: dragX === 0 ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  )
}

function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight
  )
  useEffect(() => {
    const handler = () => setHeight(window.innerHeight)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return height
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
  const viewportHeight = useViewportHeight()
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('collapsed')
  const sheetCollapsedPx = Math.round(viewportHeight * SHEET_SNAP_COLLAPSED_VH)
  const sheetExpandedPx = Math.round(viewportHeight * SHEET_SNAP_EXPANDED_VH)
  const mainSheetPx = sheetSnap === 'collapsed' ? sheetCollapsedPx : sheetExpandedPx
  const detailSheetPx = Math.round(viewportHeight * DETAIL_SHEET_VH)
  // Map's bottom obstruction: detail sheets (50vh) take precedence when one
  // is open; otherwise the main sheet's current snap height. Desktop = 0.
  const showingDetailSheet = !!selectedPlace || !!selectedHotel || !!selectedJourney
  const mapBottomPadPx = isDesktop ? 0 : showingDetailSheet ? detailSheetPx : mainSheetPx

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

  // Day-column clicks route through the unified handler with `'day-column'`
  // origin baked in. Memoized so DayColumn's effect deps stay stable.
  const handleSelectFromDayColumn = useCallback(
    (place: PlaceRow) => onSelectPlace(place, 'day-column'),
    [onSelectPlace]
  )

  // Trip-wide neighbours of the current day-tab (null when on Places, or at
  // the trip edges). Drives swipe gestures and edge-chevron visibility.
  const prevDay = useMemo(
    () => (mobileTab === PLACES_TAB ? null : getAdjacentDay(mobileTab, -1)),
    [mobileTab]
  )
  const nextDay = useMemo(
    () => (mobileTab === PLACES_TAB ? null : getAdjacentDay(mobileTab, 1)),
    [mobileTab]
  )

  // Navigate to a specific trip day. If the day belongs to a city other than
  // the current one (e.g. swiping past a transit boundary), also fire
  // onNavigate so the URL + map context follow.
  const goToDay = useCallback(
    (day: TripDay) => {
      setMobileTab(day.date)
      if (!day.cities.includes(city)) {
        const targetCity = day.cities[day.cities.length - 1]
        onNavigate({ view: 'itinerary', city: targetCity })
      }
    },
    [city, onNavigate]
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

                {/* Map + detail panel column.
                    The detail panel sits below the map as a sibling — never
                    overlays it. Map shrinks vertically when a selection is
                    active; height transition is gated on `detailSelection`.
                    Phase 5 will add a ResizeObserver-driven re-pan; for now
                    CityMap's existing selection-change pan handles the new
                    target, just before the height transition completes. */}
                <div
                  className={cn(
                    'flex-1 flex flex-col overflow-hidden',
                    isResizing && 'pointer-events-none'
                  )}
                >
                  <div className="flex-1 overflow-hidden min-h-0">
                    <CityMap
                      city={city}
                      selectedPlace={selectedPlace}
                      onSelectPlace={onSelectPlace}
                      onEditPlace={onEditPlace}
                      selectedHotel={selectedHotel}
                      onSelectHotel={onSelectHotel}
                      onEditHotel={onEditHotel}
                      selectedJourney={selectedJourney}
                      onSelectJourney={onSelectJourney}
                      onEditJourney={onEditJourney}
                      bottomPadPx={mapBottomPadPx}
                      showFloatingCards={false}
                    />
                  </div>
                  <div
                    className="overflow-hidden border-t bg-background"
                    style={{
                      height: detailSelection ? DESKTOP_DETAIL_PANEL_PX : 0,
                      transition: `height ${DETAIL_PANEL_TRANSITION_MS}ms ease-out`,
                    }}
                  >
                    {detailSelection && (
                      <DetailPanel
                        selection={detailSelection}
                        onClose={handleCloseDetail}
                        onEdit={handleEditDetail}
                      />
                    )}
                  </div>
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
                selectedHotel={selectedHotel}
                onSelectHotel={onSelectHotel}
                onEditHotel={onEditHotel}
                selectedJourney={selectedJourney}
                onSelectJourney={onSelectJourney}
                onEditJourney={onEditJourney}
                bottomPadPx={mapBottomPadPx}
                showFloatingCards={false}
              />
            </div>

            {selectedPlace ? (
              /* Place detail sheet — replaces the day-columns sheet while a
                 place is selected. The itinerary sheet collapses to an 80px
                 peek handle underneath so the user can tap it to dismiss. */
              <div
                className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: detailSheetPx }}
              >
                <div className="flex-1 overflow-hidden">
                  <PlaceDetailCard
                    place={selectedPlace}
                    onClose={() => onSelectPlace(null)}
                    onEdit={() => onEditPlace(selectedPlace)}
                    variant="sheet"
                  />
                </div>
              </div>
            ) : selectedHotel ? (
              /* Hotel detail sheet — same shape as the place sheet. */
              <div
                className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: detailSheetPx }}
              >
                <div className="flex-1 overflow-hidden">
                  <HotelDetailCard
                    hotel={selectedHotel}
                    onClose={() => onSelectHotel(null)}
                    onEdit={() => onEditHotel(selectedHotel)}
                    variant="sheet"
                  />
                </div>
              </div>
            ) : selectedJourney ? (
              /* Journey detail sheet — same shape as place/hotel sheets. */
              <div
                className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: detailSheetPx }}
              >
                <div className="flex-1 overflow-hidden">
                  <TransportDetailCard
                    journey={selectedJourney}
                    onClose={() => onSelectJourney(null)}
                    onEdit={() => onEditJourney(selectedJourney)}
                    variant="sheet"
                  />
                </div>
              </div>
            ) : (
              /* Default itinerary sheet — mobile uses single-column day-tab
                 navigation instead of horizontally scrolling all days. The
                 backlog (`Places`) is a peer tab; only one column is mounted
                 at a time, which incidentally makes cross-day DnD impossible
                 on mobile (within-day reorders still work). The sheet itself
                 is draggable between collapsed/expanded snap points. */
              <BottomSheet
                collapsedPx={sheetCollapsedPx}
                expandedPx={sheetExpandedPx}
                snap={sheetSnap}
                onSnapChange={setSheetSnap}
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
                  <DayColumnSwiper
                    hasPrev={!!prevDay}
                    hasNext={!!nextDay}
                    onSwipePrev={() => prevDay && goToDay(prevDay)}
                    onSwipeNext={() => nextDay && goToDay(nextDay)}
                  >
                    <DayColumn
                      key={mobileTab}
                      dayDate={mobileTab}
                      onSelectPlace={handleSelectFromDayColumn}
                      onSelectHotel={onSelectHotel}
                      onSelectJourney={onSelectJourney}
                      fillWidth
                    />
                  </DayColumnSwiper>
                )}
              </BottomSheet>
            )}
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
      </DndContext>
    </div>
  )
}
