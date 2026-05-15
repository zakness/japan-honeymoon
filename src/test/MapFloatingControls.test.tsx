import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapFloatingControls } from '@/components/itinerary/MapFloatingControls'

describe('MapFloatingControls', () => {
  it('renders the unscheduled pill when the toggle is enabled', () => {
    render(
      <MapFloatingControls
        showUnscheduledToggle={true}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /Unscheduled/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Recenter map/i })).toBeInTheDocument()
  })

  it('hides the unscheduled pill on the Places tab (toggle disabled)', () => {
    render(
      <MapFloatingControls
        showUnscheduledToggle={false}
        showUnscheduled={true}
        onShowUnscheduledChange={() => {}}
        onRecenter={() => {}}
      />
    )
    expect(screen.queryByRole('button', { name: /Unscheduled/i })).not.toBeInTheDocument()
    // The recenter button stays visible regardless of tab.
    expect(screen.getByRole('button', { name: /Recenter map/i })).toBeInTheDocument()
  })

  it('toggles showUnscheduled when the pill is clicked', () => {
    const onShowUnscheduledChange = vi.fn<(v: boolean) => void>()
    render(
      <MapFloatingControls
        showUnscheduledToggle={true}
        showUnscheduled={false}
        onShowUnscheduledChange={onShowUnscheduledChange}
        onRecenter={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Unscheduled/i }))
    expect(onShowUnscheduledChange).toHaveBeenCalledWith(true)
  })

  it('fires onRecenter when the recenter button is clicked', () => {
    const onRecenter = vi.fn<() => void>()
    render(
      <MapFloatingControls
        showUnscheduledToggle={true}
        showUnscheduled={false}
        onShowUnscheduledChange={() => {}}
        onRecenter={onRecenter}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Recenter map/i }))
    expect(onRecenter).toHaveBeenCalledTimes(1)
  })
})
