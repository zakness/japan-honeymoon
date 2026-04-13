import { useState, useRef, useEffect } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { ItineraryItem } from '@/components/day/ItineraryItem'
import { TransportItem } from '@/components/day/TransportItem'
import { PlaceCard } from '@/components/places/PlaceCard'
import { cn } from '@/lib/utils'
import type { NavState } from '@/components/layout/AppShell'
import { getDaysForCity, type City, type TripDay } from '@/config/trip'
import { useCrossItineraryDnD } from '@/hooks/useCrossItineraryDnD'
import { CityStrip } from './CityStrip'
import { CityMap } from './CityMap'
import { DayColumn } from './DayColumn'
import { UnscheduledColumn } from './UnscheduledColumn'

interface ItineraryViewProps {
  city: City
  onNavigate: (state: NavState) => void
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

export function ItineraryView({ city: initialCity, onNavigate }: ItineraryViewProps) {
  const [selectedCity, setSelectedCity] = useState<City>(initialCity)
  const [splitPercent, setSplitPercent] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const cityDays: TripDay[] = getDaysForCity(selectedCity)
  const { sensors, activeDrag, handleDragStart, handleDragEnd } = useCrossItineraryDnD(cityDays)

  function handleSelectCity(city: City) {
    setSelectedCity(city)
    onNavigate({ view: 'itinerary', city })
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

  const itineraryPanel = (
    <>
      <UnscheduledColumn city={selectedCity} />
      <div className="flex overflow-x-auto">
        {cityDays.map((day) => (
          <DayColumn key={day.date} dayDate={day.date} />
        ))}
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-full">
      {/* CityStrip — desktop only; on mobile it lives inside the bottom sheet */}
      {isDesktop && <CityStrip selectedCity={selectedCity} onSelectCity={handleSelectCity} />}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {isDesktop ? (
          /* ── Desktop layout ─────────────────────────────────────────────── */
          <div
            ref={splitContainerRef}
            className={cn('flex flex-1 overflow-hidden', isResizing && 'select-none')}
          >
            {/* Itinerary panel */}
            <div
              className="flex overflow-hidden border-r shrink-0"
              style={{ width: `${splitPercent}%` }}
            >
              {itineraryPanel}
            </div>

            {/* Resize divider */}
            <div
              className={cn(
                'w-1 shrink-0 cursor-col-resize transition-colors',
                isResizing ? 'bg-primary/40' : 'hover:bg-primary/20'
              )}
              onPointerDown={handleDividerPointerDown}
              onPointerMove={handleDividerPointerMove}
              onPointerUp={handleDividerPointerUp}
            />

            {/* Map panel */}
            <div className={cn('flex-1 overflow-hidden', isResizing && 'pointer-events-none')}>
              <CityMap city={selectedCity} />
            </div>
          </div>
        ) : (
          /* ── Mobile layout ──────────────────────────────────────────────── */
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0">
              <CityMap city={selectedCity} />
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col"
              style={{ height: '58vh' }}
            >
              <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
                <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <CityStrip selectedCity={selectedCity} onSelectCity={handleSelectCity} />
              <div className="flex flex-1 overflow-hidden">{itineraryPanel}</div>
            </div>
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
