import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransportDialog } from '@/components/day/TransportDialog'
import type { Journey, TransportLegRow } from '@/types/transport'

const mutateAsync = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useTransport', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/useTransport')>('@/hooks/useTransport')
  return {
    ...actual,
    useUpdateJourney: () => ({ mutateAsync, isPending: false }),
  }
})

// PlaceSearch (used inside TransportLegEditor) pulls in the Google Maps SDK.
vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: () => null,
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/hooks/useGooglePlaceDetails', () => ({
  useGooglePlaceDetails: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/hooks/usePlaces', () => ({
  usePlaceByGoogleId: () => ({ data: null }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function makeLeg(overrides: Partial<TransportLegRow> & { id: string }): TransportLegRow {
  return {
    created_at: '',
    updated_at: '',
    transport_id: 't1',
    leg_index: 0,
    mode: 'shinkansen',
    origin_name: 'Tokyo',
    origin_place_id: null,
    origin_lat: null,
    origin_lng: null,
    destination_name: 'Kyoto',
    destination_place_id: null,
    destination_lat: null,
    destination_lng: null,
    departure_time: '18:00:00',
    arrival_time: '20:00:00',
    booking_status: 'not_booked',
    confirmation: null,
    notes: null,
    ...overrides,
  }
}

function makeJourney(): Journey {
  return {
    parent: {
      id: 't1',
      created_at: '',
      updated_at: '',
      day_date: '2026-05-20',
      time_slot: 'morning',
      sort_order: 0,
      title: null,
      notes: null,
    },
    legs: [makeLeg({ id: 't1-l0', transport_id: 't1' })],
  }
}

describe('TransportDialog — sticky slot invariant', () => {
  beforeEach(() => {
    mutateAsync.mockClear()
  })

  it('does not send time_slot in parentPatch when saving', async () => {
    // Journey is in `morning` but its only leg departs at 18:00 — which
    // derives to `dinner`. Saving must NOT relocate the card.
    render(<TransportDialog journey={makeJourney()} open={true} onOpenChange={vi.fn()} />, {
      wrapper,
    })

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await Promise.resolve()

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    const { parentPatch } = mutateAsync.mock.calls[0][0]
    expect(parentPatch).not.toHaveProperty('time_slot')
    expect(parentPatch).toMatchObject({
      title: null,
      notes: null,
      day_date: '2026-05-20',
    })
  })
})
