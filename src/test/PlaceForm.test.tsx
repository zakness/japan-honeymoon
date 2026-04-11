import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlaceForm } from '@/components/places/PlaceForm'

// Mock the Google Maps library — not available in jsdom
vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: () => null,
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Supabase hooks
vi.mock('@/hooks/usePlaces', () => ({
  useCreatePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePlaceByGoogleId: () => ({ data: null }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('PlaceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all required fields in create mode', () => {
    render(<PlaceForm />, { wrapper })
    // Name and Notes have explicit htmlFor — use getByLabelText
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^notes/i)).toBeInTheDocument()
    // Category / Priority / Status selects have no for attr — find by label text
    expect(screen.getByText(/^category/i)).toBeInTheDocument()
    expect(screen.getByText(/^priority/i)).toBeInTheDocument()
    expect(screen.getByText(/^status/i)).toBeInTheDocument()
  })

  it('shows the Google search input by default in create mode', () => {
    render(<PlaceForm />, { wrapper })
    expect(screen.getByPlaceholderText(/search for a restaurant/i)).toBeInTheDocument()
  })

  it('hides the search and shows all fields in manual mode', async () => {
    render(<PlaceForm />, { wrapper })
    const manualToggle = screen.getByText(/enter manually/i)
    await userEvent.click(manualToggle)
    expect(screen.queryByPlaceholderText(/search for a restaurant/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
  })

  it('shows "Search Google Maps" toggle button when in manual mode', async () => {
    render(<PlaceForm />, { wrapper })
    await userEvent.click(screen.getByText(/enter manually/i))
    // The toggle button now reads "Search Google Maps" (may appear in label + button)
    expect(screen.getAllByText(/search google maps/i).length).toBeGreaterThan(0)
  })

  it('renders in edit mode with existing place data', () => {
    const place = {
      id: 'abc-123',
      google_place_id: null,
      name: 'Ichiran Ramen',
      address: 'Shinjuku, Tokyo',
      lat: 35.69,
      lng: 139.7,
      rating: 4.5,
      price_level: 2,
      hours: null,
      website: null,
      phone: null,
      photos: null,
      category: 'restaurant',
      tags: ['ramen', 'solo'] as string[],
      priority: 'must-do',
      status: 'researching',
      notes: 'Get the rich tonkotsu',
      city: 'tokyo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as const

    render(<PlaceForm place={place} />, { wrapper })

    expect(screen.getByDisplayValue('Ichiran Ramen')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Get the rich tonkotsu')).toBeInTheDocument()
    expect(screen.getByText('Update place')).toBeInTheDocument()
  })

  it('shows tags when editing a place with tags', () => {
    const place = {
      id: 'abc-123',
      google_place_id: null,
      name: 'Test Place',
      address: null,
      lat: null,
      lng: null,
      rating: null,
      price_level: null,
      hours: null,
      website: null,
      phone: null,
      photos: null,
      category: 'attraction',
      tags: ['shrine', 'historic'] as string[],
      priority: 'want-to',
      status: 'researching',
      notes: null,
      city: 'kyoto',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as const

    render(<PlaceForm place={place} />, { wrapper })
    expect(screen.getByText('shrine')).toBeInTheDocument()
    expect(screen.getByText('historic')).toBeInTheDocument()
  })

  it('renders a submit button in create mode', () => {
    render(<PlaceForm />, { wrapper })
    const submitBtn = screen.getByRole('button', { name: /save place/i })
    expect(submitBtn).toBeInTheDocument()
    expect(submitBtn).not.toBeDisabled()
  })
})
