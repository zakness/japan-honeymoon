import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DayStrip, PLACES_TAB, type DayTabValue } from '@/components/itinerary/DayStrip'

describe('DayStrip', () => {
  it('renders the city days plus the Places tab', () => {
    render(<DayStrip city="hakone" selected="2026-05-22" onSelect={() => {}} />)
    // Hakone spans Fri 22 → Sun 24 in the trip config
    expect(screen.getByRole('button', { name: /^Fri 22$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sat 23$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sun 24$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Places$/ })).toBeInTheDocument()
  })

  it('marks the selected day with the city tint background', () => {
    render(<DayStrip city="hakone" selected="2026-05-23" onSelect={() => {}} />)
    const sat = screen.getByRole('button', { name: /^Sat 23$/ })
    expect(sat.style.backgroundColor).not.toBe('')
  })

  it('marks the Places tab when selected with the secondary background', () => {
    render(<DayStrip city="hakone" selected={PLACES_TAB} onSelect={() => {}} />)
    const places = screen.getByRole('button', { name: /^Places$/ })
    expect(places.className).toMatch(/bg-secondary/)
  })

  it('fires onSelect with the day date when a day tab is clicked', () => {
    const onSelect = vi.fn<(value: DayTabValue) => void>()
    render(<DayStrip city="hakone" selected="2026-05-22" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /^Sun 24$/ }))
    expect(onSelect).toHaveBeenCalledWith('2026-05-24')
  })

  it('fires onSelect with the PLACES_TAB sentinel when Places is clicked', () => {
    const onSelect = vi.fn<(value: DayTabValue) => void>()
    render(<DayStrip city="hakone" selected="2026-05-22" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /^Places$/ }))
    expect(onSelect).toHaveBeenCalledWith(PLACES_TAB)
  })
})
