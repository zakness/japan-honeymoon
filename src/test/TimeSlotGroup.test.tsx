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

describe('TimeSlotGroup add affordance', () => {
  const baseProps = {
    items: [] as SlotItem[],
    dayDate: '2026-05-15',
    flightEvents: [] as FlightEvent[],
  }

  it('renders an add affordance labelled for the slot', () => {
    renderInDnd(<TimeSlotGroup {...baseProps} slot="breakfast" label="Breakfast" kind="meal" />)
    expect(screen.getByRole('button', { name: /add to breakfast/i })).toBeInTheDocument()
  })

  it('fires onAddClick with the correct slot when the add affordance is clicked', async () => {
    const onAddClick = vi.fn()
    renderInDnd(
      <TimeSlotGroup
        {...baseProps}
        slot="morning"
        label="Morning"
        kind="gap"
        onAddClick={onAddClick}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /add to morning/i }))
    expect(onAddClick).toHaveBeenCalledTimes(1)
    expect(onAddClick).toHaveBeenCalledWith('morning')
  })

  it('does not throw when the add affordance is clicked without an onAddClick handler', async () => {
    renderInDnd(<TimeSlotGroup {...baseProps} slot="evening" label="Evening" kind="gap" />)
    await expect(
      userEvent.click(screen.getByRole('button', { name: /add to evening/i }))
    ).resolves.not.toThrow()
  })

  it('renders the add affordance (no "Drop here" placeholder) regardless of empty state', () => {
    renderInDnd(<TimeSlotGroup {...baseProps} slot="dinner" label="Dinner" kind="meal" />)
    expect(screen.queryByText(/drop here/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to dinner/i })).toBeInTheDocument()
  })
})
