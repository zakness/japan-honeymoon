import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItineraryView } from '@/components/itinerary/ItineraryView'

// Force the mobile branch by stubbing matchMedia to "no, not desktop".
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '(min-width: 640px)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  })
})

// Replace the heavy CityMap (Google Maps + vis.gl) with a stub so we can
// render the rest of the tree without loading the maps SDK.
vi.mock('@/components/itinerary/CityMap', () => ({
  CityMap: () => <div data-testid="city-map-stub" />,
}))

// All data hooks return empty/loading-stable defaults; the mobile layout
// shouldn't depend on any specific row content for the navigation tests.
vi.mock('@/hooks/usePlaces', () => ({
  usePlaces: () => ({ data: [] }),
  useUpdatePlace: () => ({ mutateAsync: vi.fn() }),
  useDeletePlace: () => ({ mutateAsync: vi.fn() }),
  useCreatePlace: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/hooks/useAccommodations', () => ({
  useAccommodations: () => ({ data: [] }),
  useAccommodationsForDate: () => ({ morningHotel: undefined, eveningHotel: undefined }),
  useUpdateAccommodation: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/hooks/useItinerary', () => ({
  ITINERARY_KEY: ['itinerary'] as const,
  useItineraryItems: () => ({ data: [], isLoading: false }),
  useUnscheduledPlaces: () => ({ data: [] }),
  usePlaceSchedule: () => ({ data: [] }),
  useScheduledDatesByPlace: () => ({ data: undefined }),
  useCreateItineraryItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateItineraryItem: () => ({ mutateAsync: vi.fn() }),
  useDeleteItineraryItem: () => ({ mutateAsync: vi.fn() }),
  useReorderItineraryItems: () => ({ mutateAsync: vi.fn() }),
  useReorderDayItemsDynamic: () => ({ mutateAsync: vi.fn() }),
  useReorderDayItems: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/hooks/useMoveItemToDay', () => ({
  useMoveItemToDay: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/hooks/useTransport', () => ({
  useJourneysForDay: () => ({ data: [], isLoading: false }),
  useCreateJourney: () => ({ mutateAsync: vi.fn() }),
  useAllJourneys: () => ({ data: [] }),
}))
vi.mock('@/hooks/useFlights', () => ({
  useFlights: () => ({ data: [], isLoading: false }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const noop = () => {}

function renderMobile(
  props: { city: 'tokyo' | 'hakone'; onNavigate?: typeof noop } = { city: 'tokyo' }
) {
  return render(
    <ItineraryView
      city={props.city}
      onNavigate={props.onNavigate ?? noop}
      selectedPlace={null}
      selectionOrigin={null}
      onSelectPlace={noop}
      onEditPlace={noop}
      selectedHotel={null}
      onSelectHotel={noop}
      onEditHotel={noop}
      selectedJourney={null}
      onSelectJourney={noop}
      onEditJourney={noop}
    />,
    { wrapper }
  )
}

describe('ItineraryView (mobile branch)', () => {
  it('renders the day strip and defaults to the first day of the city', () => {
    renderMobile({ city: 'tokyo' })
    // Day strip shows Tokyo's days (Sat 16 → Fri 22)
    expect(screen.getByRole('button', { name: /^Sat 16$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Fri 22$/ })).toBeInTheDocument()
    // Today (2026-04-26) isn't in the trip range, so default is the first day.
    const sat = screen.getByRole('button', { name: /^Sat 16$/ })
    expect(sat.style.backgroundColor).not.toBe('')
  })

  it('switches the visible column when a day tab is clicked', () => {
    renderMobile({ city: 'tokyo' })
    const sun = screen.getByRole('button', { name: /^Sun 17$/ })
    fireEvent.click(sun)
    // Active background now on Sun 17, not Sat 16
    expect(sun.style.backgroundColor).not.toBe('')
    expect(screen.getByRole('button', { name: /^Sat 16$/ }).style.backgroundColor).toBe('')
  })

  it('renders the unscheduled column when the Places tab is clicked', () => {
    renderMobile({ city: 'tokyo' })
    const places = screen.getByRole('button', { name: /^Places$/ })
    fireEvent.click(places)
    // UnscheduledColumn header text appears
    expect(screen.getByText('Places', { selector: 'span' })).toBeInTheDocument()
  })

  it('resets to the new city default when the city prop changes externally', () => {
    const { rerender } = renderMobile({ city: 'tokyo' })
    // Switch the user to Sun 17 first
    fireEvent.click(screen.getByRole('button', { name: /^Sun 17$/ }))
    // Now simulate a city change via props (CityStrip → onNavigate → AppShell → city prop)
    rerender(
      <ItineraryView
        city="hakone"
        onNavigate={noop}
        selectedPlace={null}
        selectionOrigin={null}
        onSelectPlace={noop}
        onEditPlace={noop}
        selectedHotel={null}
        onSelectHotel={noop}
        onEditHotel={noop}
        selectedJourney={null}
        onSelectJourney={noop}
        onEditJourney={noop}
      />
    )
    // Sun 17 (a Tokyo-only day) is no longer valid → default to Hakone's first day (Fri 22)
    expect(screen.getByRole('button', { name: /^Fri 22$/ }).style.backgroundColor).not.toBe('')
  })

  it('preserves the day across a city change when the day is valid in the new city', () => {
    // Fri 22 is the Tokyo→Hakone transit day — it appears in BOTH cities'
    // day lists. This is the swipe-across-cities case: goToDay sets the
    // mobileTab AND fires onNavigate; when the city prop then updates, the
    // city-change effect should preserve the already-valid day rather than
    // resetting to the new city's default.
    const { rerender } = renderMobile({ city: 'tokyo' })
    fireEvent.click(screen.getByRole('button', { name: /^Fri 22$/ }))
    rerender(
      <ItineraryView
        city="hakone"
        onNavigate={noop}
        selectedPlace={null}
        selectionOrigin={null}
        onSelectPlace={noop}
        onEditPlace={noop}
        selectedHotel={null}
        onSelectHotel={noop}
        onEditHotel={noop}
        selectedJourney={null}
        onSelectJourney={noop}
        onEditJourney={noop}
      />
    )
    // Fri 22 stays selected in Hakone
    expect(screen.getByRole('button', { name: /^Fri 22$/ }).style.backgroundColor).not.toBe('')
  })
})
