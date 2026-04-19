import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HotelForm } from '@/components/hotels/HotelForm'
import type { AccommodationRow } from '@/types/accommodations'

vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: () => null,
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const { mutateAsync, deleteStorageObjects } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  deleteStorageObjects: vi.fn(),
}))

vi.mock('@/hooks/useAccommodations', () => ({
  useUpdateAccommodation: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>()
  return { ...actual, deleteStorageObjects }
})

vi.mock('@/hooks/usePlaces', () => ({
  usePlaceByGoogleId: () => ({ data: null }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function makeHotel(overrides: Partial<AccommodationRow> = {}): AccommodationRow {
  return {
    id: 'hotel-1',
    name: 'Hotel Indigo Tokyo Shibuya',
    city: 'tokyo',
    address: 'Shibuya, Tokyo',
    lat: 35.66,
    lng: 139.7,
    check_in_date: '2026-05-16',
    check_out_date: '2026-05-19',
    check_in_time: '15:00:00',
    check_out_time: '11:00:00',
    booked_by: 'Zak',
    booking_url: 'https://example.com/booking',
    confirmation_numbers: ['ABC123'],
    website: 'https://example.com',
    google_place_id: null,
    rating: null,
    photos: [],
    tags: [],
    notes: null,
    phone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('HotelForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('populates fields from the hotel row', () => {
    render(<HotelForm hotel={makeHotel()} />, { wrapper })

    expect(screen.getByDisplayValue('Hotel Indigo Tokyo Shibuya')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Shibuya, Tokyo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-05-16')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-05-19')).toBeInTheDocument()
    expect(screen.getByDisplayValue('15:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Zak')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('renders the Google search input by default', () => {
    render(<HotelForm hotel={makeHotel()} />, { wrapper })
    expect(screen.getByPlaceholderText(/search for the hotel/i)).toBeInTheDocument()
  })

  it('hides the search and shows manual fields after toggle', async () => {
    render(<HotelForm hotel={makeHotel()} />, { wrapper })
    await userEvent.click(screen.getByText(/enter manually/i))
    expect(screen.queryByPlaceholderText(/search for the hotel/i)).not.toBeInTheDocument()
  })

  it('submits the update mutation with hotel-only fields included', async () => {
    mutateAsync.mockResolvedValueOnce(makeHotel())
    const onSuccess = vi.fn()
    render(<HotelForm hotel={makeHotel()} onSuccess={onSuccess} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /update hotel/i }))

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.id).toBe('hotel-1')
    expect(payload.check_in_date).toBe('2026-05-16')
    expect(payload.check_out_date).toBe('2026-05-19')
    expect(payload.check_in_time).toBe('15:00')
    expect(payload.confirmation_numbers).toEqual(['ABC123'])
    expect(payload.booked_by).toBe('Zak')
    expect(onSuccess).toHaveBeenCalled()
  })

  it('calls deleteStorageObjects with photos that were removed during edit', async () => {
    mutateAsync.mockResolvedValueOnce(makeHotel())
    const initial = makeHotel({
      photos: ['https://supabase.co/x/a.jpg', 'https://supabase.co/x/b.jpg'],
    })
    render(<HotelForm hotel={initial} />, { wrapper })

    // Remove the first thumbnail via the X overlay
    const removeBtns = screen.getAllByRole('button', { name: /remove image/i })
    await userEvent.click(removeBtns[0])

    await userEvent.click(screen.getByRole('button', { name: /update hotel/i }))

    expect(deleteStorageObjects).toHaveBeenCalledWith(['https://supabase.co/x/a.jpg'])
  })

  it('blocks submit when check-out is before check-in', async () => {
    render(<HotelForm hotel={makeHotel({ check_out_date: '2026-05-15' })} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /update hotel/i }))
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
