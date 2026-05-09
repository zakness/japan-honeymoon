import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { TransportItem } from '@/components/day/TransportItem'
import type { Journey, TransportLegRow } from '@/types/transport'

vi.mock('@/hooks/useTransport', () => ({
  useDeleteTransportItem: () => ({ mutateAsync: vi.fn() }),
  useUpdateJourney: () => ({ mutateAsync: vi.fn() }),
  // TransportDialog imports from this module too — provide stubs for anything
  // it might pull. The dialog itself stays closed in these tests.
  useCreateJourney: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

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
    departure_time: '09:00:00',
    arrival_time: '11:00:00',
    booking_status: 'not_booked',
    confirmation: null,
    notes: null,
    ...overrides,
  }
}

function makeJourney(overrides: {
  id?: string
  title?: string | null
  legs?: TransportLegRow[]
}): Journey {
  const id = overrides.id ?? 't1'
  return {
    parent: {
      id,
      created_at: '',
      updated_at: '',
      day_date: '2026-05-20',
      time_slot: 'breakfast',
      sort_order: 0,
      title: overrides.title ?? null,
      notes: null,
    },
    legs: overrides.legs ?? [makeLeg({ id: `${id}-l0`, transport_id: id })],
  }
}

function renderItem(journey: Journey) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <DndContext>
        <SortableContext items={[journey.parent.id]}>
          <TransportItem journey={journey} dayDate="2026-05-20" />
        </SortableContext>
      </DndContext>
    </QueryClientProvider>
  )
}

function findCardRoot(): HTMLElement {
  // The outermost SortableItemCard root carries aria-roledescription="sortable"
  return document.querySelector('[aria-roledescription="sortable"]') as HTMLElement
}

describe('TransportItem', () => {
  it('renders a solid (non-dashed) border when every leg is booked', () => {
    const journey = makeJourney({
      legs: [
        makeLeg({ id: 'l1', booking_status: 'booked' }),
        makeLeg({ id: 'l2', leg_index: 1, booking_status: 'booked' }),
      ],
    })
    renderItem(journey)
    const root = findCardRoot()
    expect(root.className).not.toMatch(/border-dashed/)
  })

  it('renders a dashed border when at least one leg is unbooked', () => {
    const journey = makeJourney({
      legs: [
        makeLeg({ id: 'l1', booking_status: 'booked' }),
        makeLeg({ id: 'l2', leg_index: 1, booking_status: 'not_booked' }),
      ],
    })
    renderItem(journey)
    const root = findCardRoot()
    expect(root.className).toMatch(/border-dashed/)
  })

  it('renders a dashed border when there are no legs', () => {
    const journey = makeJourney({ legs: [] })
    renderItem(journey)
    const root = findCardRoot()
    expect(root.className).toMatch(/border-dashed/)
  })

  it('shows parent.title when set, even with origin and destination present', () => {
    const journey = makeJourney({
      title: 'Train to Kyoto via Nagoya',
      legs: [makeLeg({ id: 'l1', booking_status: 'booked' })],
    })
    renderItem(journey)
    expect(screen.getByText('Train to Kyoto via Nagoya')).toBeTruthy()
    expect(screen.queryByText('Tokyo → Kyoto')).toBeNull()
  })

  it('falls back to origin → destination when parent.title is unset', () => {
    const journey = makeJourney({ title: null })
    renderItem(journey)
    expect(screen.getByText('Tokyo → Kyoto')).toBeTruthy()
  })
})
