import { useState, useEffect, useCallback } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { NavBar, type AppView } from './NavBar'
import { ErrorBoundary } from './ErrorBoundary'
import { NotesView } from '@/components/notes/NotesView'
import { LogisticsView } from '@/components/logistics/LogisticsView'
import { ItineraryView } from '@/components/itinerary/ItineraryView'
import { CityStrip } from '@/components/itinerary/CityStrip'
import { PlaceEditDialog } from '@/components/places/PlaceDetail'
import { Button } from '@/components/ui/button'
import { type City } from '@/config/trip'
import type { PlaceRow } from '@/types/places'

export interface NavState {
  view: AppView
  /** Selected city in Itinerary view */
  city?: City
}

/**
 * Where a place selection originated. Used by the unscheduled column to decide
 * whether to auto-scroll the matching card into view — we skip the scroll on
 * backlog-originated clicks (user already knows where the card is) and scroll
 * on marker / day-column clicks.
 */
export type SelectionOrigin = 'backlog' | 'marker' | 'day-column'

/**
 * Overloaded selection handler. When setting a real place, an origin is
 * required so Phase 3's auto-scroll skip rule has correct data. When clearing
 * the selection (passing `null`) no origin is needed — the "current origin"
 * becomes irrelevant and will be cleared internally.
 */
export interface SelectPlaceHandler {
  (place: null): void
  (place: PlaceRow, origin: SelectionOrigin): void
}

function parseHash(): NavState {
  const hash = window.location.hash.slice(1)
  if (hash.startsWith('itinerary/')) return { view: 'itinerary', city: hash.slice(10) as City }
  if (hash === 'itinerary') return { view: 'itinerary' }
  if (hash === 'notes') return { view: 'notes' }
  if (hash === 'logistics') return { view: 'logistics' }
  if (hash === 'hotels') return { view: 'logistics' } // backward compat
  return { view: 'itinerary' }
}

function toHash(state: NavState): string {
  if (state.view === 'itinerary') return `itinerary/${state.city ?? 'tokyo'}`
  return state.view
}

export function AppShell() {
  const [nav, setNav] = useState<NavState>(parseHash)
  const [mapVisible, setMapVisible] = useState(true)
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)
  const [selectionOrigin, setSelectionOrigin] = useState<SelectionOrigin | null>(null)
  const [editingPlace, setEditingPlace] = useState<PlaceRow | null>(null)

  useEffect(() => {
    const handler = () => setNav(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = useCallback((next: NavState) => {
    window.location.hash = toHash(next)
    setNav(next)
  }, [])

  /**
   * Unified selection handler. Any of the three click surfaces (backlog card,
   * map marker, day-column place name) routes through here. Also auto-reveals
   * the map when a backlog click happens while the map is hidden — the point
   * of clicking a backlog card is to see where the place sits geographically,
   * so a hidden map defeats the purpose.
   */
  const handleSelectPlace = useCallback<SelectPlaceHandler>(
    ((place: PlaceRow | null, origin?: SelectionOrigin) => {
      setSelectedPlace(place)
      setSelectionOrigin(place ? (origin ?? null) : null)
      if (place && origin === 'backlog') {
        setMapVisible((visible) => (visible ? visible : true))
      }
    }) as SelectPlaceHandler,
    []
  )

  /**
   * Open the edit dialog for a place. Called from inside the detail card's
   * Edit button (and the "Add location" affordance in the no-coords state).
   * The dialog mounts at AppShell level so there's a single instance driven by
   * `editingPlace` state, decoupled from the card's lifecycle.
   */
  const handleEditPlace = useCallback((place: PlaceRow) => {
    setEditingPlace(place)
  }, [])

  /**
   * After a successful edit, refresh `selectedPlace` so the still-open card
   * shows the new data instead of the stale row we had when it opened.
   */
  const handleEditSuccess = useCallback((updated: PlaceRow) => {
    setSelectedPlace((current) => (current?.id === updated.id ? updated : current))
  }, [])

  function handleViewChange(view: AppView) {
    navigate({ view })
  }

  const activeCity: City = nav.city ?? 'tokyo'

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Top nav — hidden on mobile (replaced by bottom nav) */}
      <div className="hidden sm:block">
        <NavBar activeView={nav.view} onViewChange={handleViewChange} />
        {/* City strip lives in the top nav when the Itinerary tab is active.
            On mobile it's rendered inside the itinerary bottom sheet instead. */}
        {nav.view === 'itinerary' && (
          <CityStrip
            selectedCity={activeCity}
            onSelectCity={(city) => navigate({ view: 'itinerary', city })}
            trailing={
              <Button
                variant={mapVisible ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setMapVisible((v) => !v)}
                aria-label={mapVisible ? 'Hide map' : 'Show map'}
                aria-pressed={mapVisible}
                title={mapVisible ? 'Hide map' : 'Show map'}
              >
                <MapIcon />
              </Button>
            }
          />
        )}
      </div>

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {nav.view === 'itinerary' && (
            <ItineraryView
              city={activeCity}
              onNavigate={navigate}
              mapVisible={mapVisible}
              selectedPlace={selectedPlace}
              selectionOrigin={selectionOrigin}
              onSelectPlace={handleSelectPlace}
              onEditPlace={handleEditPlace}
            />
          )}
          {nav.view === 'notes' && <NotesView />}
          {nav.view === 'logistics' && <LogisticsView />}
        </ErrorBoundary>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="sm:hidden border-t bg-background">
        <NavBar activeView={nav.view} onViewChange={handleViewChange} mobile />
      </div>

      {/* Single mount point for the place edit dialog. Driven by `editingPlace`
          state so any click surface (detail card Edit, no-coords Add location)
          can open it without needing its own Dialog instance. */}
      <PlaceEditDialog
        place={editingPlace}
        onOpenChange={(open) => {
          if (!open) setEditingPlace(null)
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
