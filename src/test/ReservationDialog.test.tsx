import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReservationDialog } from '@/components/day/ReservationDialog'
import type { ItineraryItemWithPlace } from '@/types/itinerary'

const mutateAsync = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useItinerary', () => ({
  useUpdateItineraryItem: () => ({ mutateAsync, isPending: false }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function makeItem(overrides: Partial<ItineraryItemWithPlace> = {}): ItineraryItemWithPlace {
  return {
    id: 'item-1',
    accommodation_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    day_date: '2026-05-17',
    hotel_event_role: null,
    images: null,
    is_decided: true,
    place_id: 'place-1',
    reservation_notes: null,
    reservation_time: '18:00:00',
    sort_order: 0,
    text_note: null,
    time_slot: 'afternoon',
    place: null,
    ...overrides,
  } as ItineraryItemWithPlace
}

describe('ReservationDialog — sticky slot invariant', () => {
  beforeEach(() => {
    mutateAsync.mockClear()
  })

  it('does not send time_slot in the update payload when saving a reservation', async () => {
    // Item is in `afternoon` with a 6pm reservation. Per deriveTimeSlot,
    // 18:00 maps to `dinner` — but saving must NOT relocate the card.
    render(<ReservationDialog item={makeItem()} open={true} onOpenChange={vi.fn()} />, { wrapper })

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    // Wait a tick for the async handleSave to fire mutateAsync.
    await Promise.resolve()

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload).not.toHaveProperty('time_slot')
    expect(payload).toMatchObject({
      id: 'item-1',
      reservation_time: '18:00',
      reservation_notes: null,
    })
  })

  it('does not send time_slot when clearing a reservation either', async () => {
    render(<ReservationDialog item={makeItem()} open={true} onOpenChange={vi.fn()} />, { wrapper })

    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))
    await Promise.resolve()

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload).not.toHaveProperty('time_slot')
    expect(payload).toMatchObject({
      id: 'item-1',
      reservation_time: null,
      reservation_notes: null,
    })
  })
})
