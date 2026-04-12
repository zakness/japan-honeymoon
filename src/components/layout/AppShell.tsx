import { useState, useEffect, useCallback } from 'react'
import { NavBar, type AppView } from './NavBar'
import { ErrorBoundary } from './ErrorBoundary'
import { MapView } from '@/components/map/MapView'
import { DayView } from '@/components/day/DayView'
import { NotesView } from '@/components/notes/NotesView'
import { LogisticsView } from '@/components/logistics/LogisticsView'
import { TRIP_DAYS } from '@/config/trip'

export interface NavState {
  view: AppView
  /** Date to focus in Day view, e.g. '2026-05-17' */
  dayDate?: string
  /** Place ID to focus in Map view — produces #map/place/[id] */
  focusPlaceId?: string
  /** Hotel ID to focus in Map view — produces #map/hotel/[id] */
  focusHotelId?: string
}

function parseHash(): NavState {
  const hash = window.location.hash.slice(1)
  if (hash.startsWith('map/place/')) return { view: 'map', focusPlaceId: hash.slice(10) }
  if (hash.startsWith('map/hotel/')) return { view: 'map', focusHotelId: hash.slice(10) }
  if (hash.startsWith('day/')) {
    const date = hash.slice(4)
    const valid = TRIP_DAYS.find((d) => d.date === date)
    return { view: 'day', dayDate: valid ? date : undefined }
  }
  if (hash === 'day') return { view: 'day' }
  if (hash === 'notes') return { view: 'notes' }
  if (hash === 'logistics') return { view: 'logistics' }
  if (hash === 'hotels') return { view: 'logistics' } // backward compat
  return { view: 'map' }
}

function toHash(state: NavState): string {
  if (state.view === 'map') {
    if (state.focusPlaceId) return `map/place/${state.focusPlaceId}`
    if (state.focusHotelId) return `map/hotel/${state.focusHotelId}`
    return 'map'
  }
  if (state.view === 'day') return state.dayDate ? `day/${state.dayDate}` : 'day'
  return state.view
}

export function AppShell() {
  const [nav, setNav] = useState<NavState>(parseHash)

  useEffect(() => {
    const handler = () => setNav(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = useCallback((next: NavState) => {
    window.location.hash = toHash(next)
    setNav(next)
  }, [])

  function handleViewChange(view: AppView) {
    navigate({ view })
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Top nav — hidden on mobile (replaced by bottom nav) */}
      <div className="hidden sm:block">
        <NavBar activeView={nav.view} onViewChange={handleViewChange} />
      </div>

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {nav.view === 'map' && (
            <MapView
              focusPlaceId={nav.focusPlaceId}
              focusHotelId={nav.focusHotelId}
              onNavigate={navigate}
            />
          )}
          {nav.view === 'day' && <DayView initialDate={nav.dayDate} onNavigate={navigate} />}
          {nav.view === 'notes' && <NotesView />}
          {nav.view === 'logistics' && <LogisticsView />}
        </ErrorBoundary>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="sm:hidden border-t bg-background">
        <NavBar activeView={nav.view} onViewChange={handleViewChange} mobile />
      </div>
    </div>
  )
}
