import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  describe('hero photo', () => {
    it('does not render a +N badge when there is only one photo', () => {
      const place = { ...PLACE, photos: ['https://example.com/a.jpg'] }
      render(<PlaceDetailCard place={place} onClose={onClose} onEdit={onEdit} />, { wrapper })
      expect(screen.getByRole('button', { name: /open photo$/i })).toBeInTheDocument()
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument()
    })

    it('renders +N badge when there are multiple photos', () => {
      const place = {
        ...PLACE,
        photos: ['https://a.jpg', 'https://b.jpg', 'https://c.jpg'],
      }
      render(<PlaceDetailCard place={place} onClose={onClose} onEdit={onEdit} />, { wrapper })
      expect(screen.getByRole('button', { name: /open photos \(3\)/i })).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })
  })

  describe('hours', () => {
    const hoursPlace: PlaceRow = {
      ...PLACE,
      hours: {
        weekdayDescriptions: [
          'Monday: 10:00 AM – 10:30 PM',
          'Tuesday: 10:00 AM – 10:30 PM',
          'Wednesday: 10:00 AM – 10:30 PM',
          'Thursday: 10:00 AM – 10:30 PM',
          'Friday: 10:00 AM – 10:30 PM',
          'Saturday: 10:00 AM – 10:30 PM',
          'Sunday: Closed',
        ],
      },
    }

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows "Open · closes X" when currently open', () => {
      // Saturday 2026-04-18 14:00 (within 10 AM – 10:30 PM)
      vi.setSystemTime(new Date('2026-04-18T14:00:00'))
      render(<PlaceDetailCard place={hoursPlace} onClose={onClose} onEdit={onEdit} />, { wrapper })
      expect(screen.getByText(/open · closes 10:30 PM/i)).toBeInTheDocument()
    })

    it('shows "Closed · opens X" when today is closed', () => {
      // Sunday 2026-04-19 — the "Closed" day; next open is Monday 10:00 AM
      vi.setSystemTime(new Date('2026-04-19T12:00:00'))
      render(<PlaceDetailCard place={hoursPlace} onClose={onClose} onEdit={onEdit} />, { wrapper })
      expect(screen.getByText(/closed · opens 10:00 AM/i)).toBeInTheDocument()
    })

    it('hides the 7-day list by default and reveals it on click', () => {
      vi.setSystemTime(new Date('2026-04-18T14:00:00'))
      render(<PlaceDetailCard place={hoursPlace} onClose={onClose} onEdit={onEdit} />, { wrapper })
      expect(screen.queryByText('Tuesday: 10:00 AM – 10:30 PM')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /open · closes 10:30 PM/i }))
      expect(screen.getByText('Tuesday: 10:00 AM – 10:30 PM')).toBeInTheDocument()
    })
  })

  describe('address', () => {
    it('clamps to one line by default and expands on click', async () => {
      const place = {
        ...PLACE,
        address:
          '〒150-6145 Tokyo, Shibuya, 2-chōme−24−12 スクランブルスクエア 14階・45階 46階・屋上',
      }
      render(<PlaceDetailCard place={place} onClose={onClose} onEdit={onEdit} />, { wrapper })
      const toggle = screen.getByRole('button', { name: new RegExp(place.address.slice(0, 20)) })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('website + phone links', () => {
    it('renders website as an icon link with the href and tooltip', () => {
      const place = { ...PLACE, website: 'https://example.com/place', phone: null }
      render(<PlaceDetailCard place={place} onClose={onClose} onEdit={onEdit} />, { wrapper })
      const link = screen.getByRole('link', { name: /open website/i })
      expect(link).toHaveAttribute('href', 'https://example.com/place')
      expect(link).toHaveAttribute('title', 'https://example.com/place')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('renders phone as a tel: link', () => {
      const place = { ...PLACE, website: null, phone: '03-1234-5678' }
      render(<PlaceDetailCard place={place} onClose={onClose} onEdit={onEdit} />, { wrapper })
      const link = screen.getByRole('link', { name: /call 03-1234-5678/i })
      expect(link).toHaveAttribute('href', 'tel:03-1234-5678')
    })
  })
})
