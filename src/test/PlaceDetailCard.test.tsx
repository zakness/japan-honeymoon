import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlaceDetailCard } from '@/components/itinerary/PlaceDetailCard'
import type { PlaceRow } from '@/types/places'

// Mock the hooks that PlaceDetailContent uses internally
vi.mock('@/hooks/usePlaces', () => ({
  useDeletePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useItinerary', () => ({
  useCreateItineraryItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePlaceSchedule: () => ({ data: [] }),
}))

const PLACE: PlaceRow = {
  id: 'test-1',
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

const NO_COORDS_PLACE: PlaceRow = {
  ...PLACE,
  id: 'test-2',
  name: 'Mystery Ramen Shop',
  lat: null,
  lng: null,
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('PlaceDetailCard', () => {
  let onClose: () => void
  let onEdit: () => void

  beforeEach(() => {
    onClose = vi.fn()
    onEdit = vi.fn()
    vi.clearAllMocks()
  })

  it('renders the place name and notes', () => {
    render(<PlaceDetailCard place={PLACE} onClose={onClose} onEdit={onEdit} />, { wrapper })
    expect(screen.getByText('Fushimi Inari')).toBeInTheDocument()
    expect(screen.getByText('Arrive early to beat the crowds')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    render(<PlaceDetailCard place={PLACE} onClose={onClose} onEdit={onEdit} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /close details/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    render(<PlaceDetailCard place={PLACE} onClose={onClose} onEdit={onEdit} />, { wrapper })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders floating variant styles by default', () => {
    render(<PlaceDetailCard place={PLACE} onClose={onClose} onEdit={onEdit} />, { wrapper })
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('absolute')
    expect(dialog.className).toContain('w-[360px]')
  })

  it('renders sheet variant styles when specified', () => {
    render(<PlaceDetailCard place={PLACE} onClose={onClose} onEdit={onEdit} variant="sheet" />, {
      wrapper,
    })
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).not.toContain('absolute')
    expect(dialog.className).toContain('h-full')
  })

  it('shows "No location" state for places without coordinates', () => {
    render(<PlaceDetailCard place={NO_COORDS_PLACE} onClose={onClose} onEdit={onEdit} />, {
      wrapper,
    })
    expect(screen.getByText(/no location/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument()
  })

  it('calls onEdit when the Edit button is clicked', async () => {
    render(<PlaceDetailCard place={PLACE} onClose={onClose} onEdit={onEdit} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
