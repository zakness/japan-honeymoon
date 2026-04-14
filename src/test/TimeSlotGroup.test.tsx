import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { TimeSlotGroup } from '@/components/day/TimeSlotGroup'
import type { SlotItem } from '@/types/transport'
import type { FlightEvent } from '@/lib/logistics-utils'

// `useDroppable` requires a surrounding DndContext; the "+ Add" zone does not.
function renderInDnd(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>)
}

describe('TimeSlotGroup "+ Add" zone', () => {
  const baseProps = {
    items: [] as SlotItem[],
    dayDate: '2026-05-15',
    flightEvents: [] as FlightEvent[],
    hotelAnchor: null,
  }

  it('renders an add button labelled for the slot', () => {
    renderInDnd(<TimeSlotGroup {...baseProps} slot="morning" label="Morning" />)
    expect(screen.getByRole('button', { name: /add to morning/i })).toBeInTheDocument()
  })

  it('fires onAddClick with the correct slot when the add button is clicked', async () => {
    const onAddClick = vi.fn()
    renderInDnd(
      <TimeSlotGroup {...baseProps} slot="afternoon" label="Afternoon" onAddClick={onAddClick} />
    )
    await userEvent.click(screen.getByRole('button', { name: /add to afternoon/i }))
    expect(onAddClick).toHaveBeenCalledTimes(1)
    expect(onAddClick).toHaveBeenCalledWith('afternoon')
  })

  it('does not throw when the add button is clicked without an onAddClick handler', async () => {
    renderInDnd(<TimeSlotGroup {...baseProps} slot="evening" label="Evening" />)
    await expect(
      userEvent.click(screen.getByRole('button', { name: /add to evening/i }))
    ).resolves.not.toThrow()
  })

  it('renders the add button (no "Drop here" placeholder) regardless of empty state', () => {
    renderInDnd(<TimeSlotGroup {...baseProps} slot="morning" label="Morning" />)
    // Old behavior: empty slots rendered a dashed "Drop here" placeholder AND
    // no plus button in the slot. New behavior: always an "Add" button, no
    // "Drop here" placeholder.
    expect(screen.queryByText(/drop here/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to morning/i })).toBeInTheDocument()
  })
})
