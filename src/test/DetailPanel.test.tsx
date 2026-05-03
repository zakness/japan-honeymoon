import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailPanel } from '@/components/itinerary/DetailPanel'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'

// Hooks used by PlaceDetailContent / HotelDetailContent.
vi.mock('@/hooks/usePlaces', () => ({
  useDeletePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useItinerary', () => ({
  useCreateItineraryItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePlaceSchedule: () => ({ data: [] }),
}))

vi.mock('@/hooks/useAccommodations', () => ({
  useAccommodations: () => ({ data: [] }),
}))

const PLACE: PlaceRow = {
  id: 'place-1',
  google_place_id: null,
  name: 'Fushimi Inari',
  address: 'Fushimi Ward, Kyoto',
  lat: 34.9671,
  lng: 135.7727,
  rating: 4.7,
  price_level: null,
  hours: null,
  website: 'https://example.com',
  phone: null,
  photos: null,
  category: 'attraction',
  tags: null,
  priority: 'must-do',
  status: 'researching',
  notes: 'Arrive early to beat the crowds',
  city: 'kyoto',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const HOTEL: AccommodationRow = {
  id: 'hotel-1',
  name: 'Park Hyatt Tokyo',
  address: '3-7-1-2 Nishi Shinjuku',
  city: 'tokyo',
  check_in_date: '2026-05-15',
  check_out_date: '2026-05-18',
  check_in_time: '15:00',
  check_out_time: '11:00',
  confirmation_numbers: ['ABC-123'],
  booked_by: null,
  booking_url: null,
  google_place_id: null,
  lat: 35.6857,
  lng: 139.6906,
  rating: 4.8,
  notes: 'Great views',
  phone: null,
  photos: [],
  tags: [],
  website: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const JOURNEY: Journey = {
  parent: {
    id: 'journey-1',
    day_date: '2026-05-22',
    time_slot: 'morning',
    sort_order: 0,
    title: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  legs: [
    {
      id: 'leg-1',
      transport_id: 'journey-1',
      leg_index: 0,
      mode: 'shinkansen',
      origin_name: 'Tokyo',
      origin_place_id: null,
      origin_lat: 35.6812,
      origin_lng: 139.7671,
      destination_name: 'Odawara',
      destination_place_id: null,
      destination_lat: 35.2569,
      destination_lng: 139.1551,
      departure_time: '09:00',
      arrival_time: '09:35',
      is_booked: true,
      confirmation: 'XYZ-9',
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('DetailPanel', () => {
  let onClose: () => void
  let onEdit: () => void

  beforeEach(() => {
    onClose = vi.fn()
    onEdit = vi.fn()
    vi.clearAllMocks()
  })

  describe('content switching by kind', () => {
    it('renders place content for kind="place"', () => {
      render(
        <DetailPanel
          selection={{ kind: 'place', place: PLACE }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      expect(screen.getByText('Fushimi Inari')).toBeInTheDocument()
      expect(screen.getByText('Arrive early to beat the crowds')).toBeInTheDocument()
    })

    it('renders hotel content for kind="hotel"', () => {
      render(
        <DetailPanel
          selection={{ kind: 'hotel', hotel: HOTEL }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      expect(screen.getByText('Park Hyatt Tokyo')).toBeInTheDocument()
    })

    it('renders journey content for kind="journey"', () => {
      render(
        <DetailPanel
          selection={{ kind: 'journey', journey: JOURNEY }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      expect(screen.getAllByText(/Tokyo → Odawara/).length).toBeGreaterThan(0)
      expect(screen.getByText(/1\/1 booked/)).toBeInTheDocument()
    })
  })

  describe('dismiss paths', () => {
    it('calls onClose when the close button is clicked', async () => {
      render(
        <DetailPanel
          selection={{ kind: 'place', place: PLACE }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      await userEvent.click(screen.getByRole('button', { name: /close details/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape is pressed', async () => {
      render(
        <DetailPanel
          selection={{ kind: 'place', place: PLACE }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('edit passthrough', () => {
    it('fires onEdit from the journey edit button', async () => {
      render(
        <DetailPanel
          selection={{ kind: 'journey', journey: JOURNEY }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
      expect(onEdit).toHaveBeenCalledTimes(1)
    })

    it('fires onEdit from the place edit button', async () => {
      render(
        <DetailPanel
          selection={{ kind: 'place', place: PLACE }}
          onClose={onClose}
          onEdit={onEdit}
        />,
        { wrapper }
      )
      await userEvent.click(screen.getByRole('button', { name: /edit/i }))
      expect(onEdit).toHaveBeenCalledTimes(1)
    })
  })
})
