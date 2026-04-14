import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddItemDialog } from '@/components/day/AddItemDialog'

// The dialog depends on several data hooks — mock them so we can render
// the controlled API in isolation.
vi.mock('@/hooks/useItinerary', () => ({
  useUnscheduledPlaces: () => ({ data: [] }),
  useCreateItineraryItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useTransport', () => ({
  useCreateTransportItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('AddItemDialog (controlled API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
