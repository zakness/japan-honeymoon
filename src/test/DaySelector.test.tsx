import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DaySelector } from '@/components/day/DaySelector'
import { TRIP_DAYS } from '@/config/trip'

describe('DaySelector', () => {
  const defaultProps = {
    selectedDate: '2026-05-16',
    onSelectDate: vi.fn(),
  }

  it('renders all 16 trip days', () => {
    render(<DaySelector {...defaultProps} />)
    // Each day button shows the day number
    TRIP_DAYS.forEach((day) => {
      const dayNum = new Date(day.date + 'T00:00:00').getDate().toString()
      expect(screen.getAllByText(dayNum).length).toBeGreaterThan(0)
    })
  })

  it('renders city labels for each day', () => {
    render(<DaySelector {...defaultProps} />)
    // Tokyo should appear multiple times
    const tokyoLabels = screen.getAllByText(/Tokyo/)
    expect(tokyoLabels.length).toBeGreaterThan(0)
  })

  it('marks transit days with a plane indicator', () => {
    render(<DaySelector {...defaultProps} />)
    const planeIndicators = screen.getAllByText('✈')
    // 6 transit days in the trip
    expect(planeIndicators).toHaveLength(6)
  })

  it('calls onSelectDate with the clicked date', async () => {
    const onSelectDate = vi.fn()
    render(<DaySelector selectedDate='2026-05-16' onSelectDate={onSelectDate} />)

    // Click the button for May 17 (day number "17")
    const buttons = screen.getAllByRole('button')
    // Find the button containing "17" (May 17)
    const may17Button = buttons.find((btn) => btn.textContent?.includes('17') && btn.textContent?.includes('Tokyo'))
    expect(may17Button).toBeDefined()
    await userEvent.click(may17Button!)

    expect(onSelectDate).toHaveBeenCalledWith('2026-05-17')
  })

  it('applies selected styling to the active date', () => {
    render(<DaySelector selectedDate='2026-05-20' onSelectDate={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    const selected = buttons.find((btn) => btn.textContent?.includes('20') && btn.classList.contains('bg-primary'))
    expect(selected).toBeDefined()
  })
})
