import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddItemDialog } from '@/components/day/AddItemDialog'
import type { PlaceRow } from '@/types/places'

// The dialog depends on several data hooks — mock them so we can render
// the controlled API in isolation. The unscheduled list is parameterised
// via a module-scoped variable so individual tests can swap it.
let mockUnscheduled: PlaceRow[] = []
vi.mock('@/hooks/useItinerary', () => ({
  useUnscheduledPlaces: () => ({ data: mockUnscheduled }),
  useCreateItineraryItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function makePlace(name: string, id = name): PlaceRow {
  return {
    id,
    name,
    city: 'tokyo',
    category: 'food',
    priority: 'want-to',
    notes: null,
    lat: 35.68,
    lng: 139.75,
    google_place_id: null,
    address: null,
    photos: null,
    rating: null,
    user_ratings_total: null,
    price_level: null,
    website: null,
    phone: null,
    opening_hours: null,
    tags: null,
    google_place_data: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  } as unknown as PlaceRow
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('AddItemDialog (controlled API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUnscheduled = []
  })

  it('does not render dialog content when closed', () => {
    render(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={false}
        onOpenChange={() => {}}
        initialSlot="morning"
      />,
      { wrapper }
    )
    expect(screen.queryByText('Add to itinerary')).not.toBeInTheDocument()
  })

  it('renders dialog content when open with the expected tabs', () => {
    render(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={true}
        onOpenChange={() => {}}
        initialSlot="afternoon"
      />,
      { wrapper }
    )
    expect(screen.getByText('Add to itinerary')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /place/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /note/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /transport/i })).toBeInTheDocument()
  })

  it('filters the unscheduled list by name (case-insensitive substring)', () => {
    mockUnscheduled = [
      makePlace('Conveyor Kaiten Sushi'),
      makePlace('Mokubaza'),
      makePlace('Torotaku'),
      makePlace('Sushi Fujioka'),
    ]
    render(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={true}
        onOpenChange={() => {}}
        initialSlot="morning"
      />,
      { wrapper }
    )

    // All four visible initially
    expect(screen.getByText('Conveyor Kaiten Sushi')).toBeInTheDocument()
    expect(screen.getByText('Mokubaza')).toBeInTheDocument()
    expect(screen.getByText('Torotaku')).toBeInTheDocument()
    expect(screen.getByText('Sushi Fujioka')).toBeInTheDocument()

    // Type "sushi" → only the two sushi places match
    const filter = screen.getByPlaceholderText(/filter places/i)
    fireEvent.change(filter, { target: { value: 'sushi' } })
    expect(screen.getByText('Conveyor Kaiten Sushi')).toBeInTheDocument()
    expect(screen.getByText('Sushi Fujioka')).toBeInTheDocument()
    expect(screen.queryByText('Mokubaza')).not.toBeInTheDocument()
    expect(screen.queryByText('Torotaku')).not.toBeInTheDocument()

    // Clear filter via X button — full list returns
    fireEvent.click(screen.getByLabelText(/clear filter/i))
    expect(screen.getByText('Mokubaza')).toBeInTheDocument()
    expect(screen.getByText('Torotaku')).toBeInTheDocument()
  })

  it('resets the filter when the dialog closes and reopens', () => {
    mockUnscheduled = [makePlace('Mokubaza'), makePlace('Torotaku')]
    const { rerender } = render(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={true}
        onOpenChange={() => {}}
        initialSlot="morning"
      />,
      { wrapper }
    )
    // Type a filter that hides everything
    fireEvent.change(screen.getByPlaceholderText(/filter places/i), {
      target: { value: 'xyzzy' },
    })
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()

    // Close the dialog
    rerender(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={false}
        onOpenChange={() => {}}
        initialSlot="morning"
      />
    )
    // Reopen — the open-transition effect should clear the filter and the
    // full list should render again
    rerender(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={true}
        onOpenChange={() => {}}
        initialSlot="morning"
      />
    )
    expect((screen.getByPlaceholderText(/filter places/i) as HTMLInputElement).value).toBe('')
    expect(screen.getByText('Mokubaza')).toBeInTheDocument()
    expect(screen.getByText('Torotaku')).toBeInTheDocument()
  })

  it('shows "No matches" when the filter excludes everything', () => {
    mockUnscheduled = [makePlace('Mokubaza'), makePlace('Torotaku')]
    render(
      <AddItemDialog
        dayDate="2026-05-15"
        currentItemCount={0}
        open={true}
        onOpenChange={() => {}}
        initialSlot="morning"
      />,
      { wrapper }
    )
    fireEvent.change(screen.getByPlaceholderText(/filter places/i), {
      target: { value: 'xyzzy' },
    })
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })

  it('renders without crashing across all three initialSlot values', () => {
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const { unmount } = render(
        <AddItemDialog
          dayDate="2026-05-15"
          currentItemCount={0}
          open={true}
          onOpenChange={() => {}}
          initialSlot={slot}
        />,
        { wrapper }
      )
      expect(screen.getByText('Add to itinerary')).toBeInTheDocument()
      unmount()
    }
  })
})
