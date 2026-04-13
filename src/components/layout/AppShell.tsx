import { useState, useEffect, useCallback } from 'react'
import { NavBar, type AppView } from './NavBar'
import { ErrorBoundary } from './ErrorBoundary'
import { NotesView } from '@/components/notes/NotesView'
import { LogisticsView } from '@/components/logistics/LogisticsView'
import { ItineraryView } from '@/components/itinerary/ItineraryView'
import { CityStrip } from '@/components/itinerary/CityStrip'
import { type City } from '@/config/trip'

export interface NavState {
  view: AppView
  /** Selected city in Itinerary view */
  city?: City
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
          />
        )}
      </div>

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {nav.view === 'itinerary' && <ItineraryView city={activeCity} onNavigate={navigate} />}
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
