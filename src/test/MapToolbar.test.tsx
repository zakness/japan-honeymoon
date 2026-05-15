import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapToolbar } from '@/components/itinerary/MapToolbar'

describe('MapToolbar', () => {
  it("renders 'All' plus a cell per city day labeled by day-of-month", () => {
    render(
      <MapToolbar
        city="hakone"
        selectedDay="all"
        onSelectDay={() => {}}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={() => {}}
      />
    )
    // Hakone spans 22 → 24 in trip config
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '22' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '23' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '24' })).toBeInTheDocument()
  })

  it('tints the selected day cell with the city color', () => {
    render(
      <MapToolbar
        city="hakone"
        selectedDay="2026-05-23"
        onSelectDay={() => {}}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={() => {}}
      />
    )
    const cell = screen.getByRole('button', { name: '23' })
    expect(cell.style.backgroundColor).not.toBe('')
  })

  it('fires onSelectDay with the date when a day cell is clicked', () => {
    const onSelectDay = vi.fn<(d: string) => void>()
    render(
      <MapToolbar
        city="hakone"
        selectedDay="all"
        onSelectDay={onSelectDay}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '24' }))
    expect(onSelectDay).toHaveBeenCalledWith('2026-05-24')
  })

  it("fires onSelectDay('all') when the All cell is clicked", () => {
    const onSelectDay = vi.fn<(d: string) => void>()
    render(
      <MapToolbar
        city="hakone"
        selectedDay="2026-05-22"
        onSelectDay={onSelectDay}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onSelectDay).toHaveBeenCalledWith('all')
  })

  it('toggles showUnscheduled when the Unscheduled pill is clicked', () => {
    const onShowUnscheduledChange = vi.fn<(v: boolean) => void>()
    const { rerender } = render(
      <MapToolbar
        city="hakone"
        selectedDay="all"
        onSelectDay={() => {}}
        showUnscheduled={false}
        onShowUnscheduledChange={onShowUnscheduledChange}
        onRecenter={() => {}}
      />
    )
    const pill = screen.getByRole('button', { name: /Unscheduled/i })
    expect(pill).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(pill)
    expect(onShowUnscheduledChange).toHaveBeenCalledWith(true)

    rerender(
      <MapToolbar
        city="hakone"
        selectedDay="all"
        onSelectDay={() => {}}
        showUnscheduled={true}
        onShowUnscheduledChange={onShowUnscheduledChange}
        onRecenter={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /Unscheduled/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    fireEvent.click(screen.getByRole('button', { name: /Unscheduled/i }))
    expect(onShowUnscheduledChange).toHaveBeenLastCalledWith(false)
  })

  it('fires onRecenter when the recenter button is clicked', () => {
    const onRecenter = vi.fn<() => void>()
    render(
      <MapToolbar
        city="hakone"
        selectedDay="all"
        onSelectDay={() => {}}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={onRecenter}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Recenter map/i }))
    expect(onRecenter).toHaveBeenCalledTimes(1)
  })
})
