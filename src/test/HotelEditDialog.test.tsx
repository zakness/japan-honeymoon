import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HotelEditDialog } from '@/components/hotels/HotelEditDialog'
import type { AccommodationRow } from '@/types/accommodations'

vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: () => null,
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/hooks/useAccommodations', () => ({
  useUpdateAccommodation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/usePlaces', () => ({
  usePlaceByGoogleId: () => ({ data: null }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const hotel: AccommodationRow = {
  id: 'hotel-1',
  name: 'Hotel Indigo Tokyo Shibuya',
  city: 'tokyo',
  address: null,
  lat: null,
  lng: null,
  check_in_date: '2026-05-16',
  check_out_date: '2026-05-19',
  check_in_time: null,
  check_out_time: null,
  booked_by: null,
  booking_url: null,
  confirmation_numbers: [],
  website: null,
  google_place_id: null,
  rating: null,
  photos: [],
  tags: [],
  notes: null,
  phone: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('HotelEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is closed when hotel is null', () => {
    render(<HotelEditDialog hotel={null} onOpenChange={vi.fn()} />, { wrapper })
    expect(screen.queryByText(/edit hotel/i)).not.toBeInTheDocument()
  })

  it('opens and renders the form when hotel is set', () => {
    render(<HotelEditDialog hotel={hotel} onOpenChange={vi.fn()} />, { wrapper })
    expect(screen.getByText(/edit hotel/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hotel Indigo Tokyo Shibuya')).toBeInTheDocument()
  })
})
