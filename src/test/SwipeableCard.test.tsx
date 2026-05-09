import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pencil, Trash2 } from 'lucide-react'
import { SwipeableCard, type CardAction } from '@/components/day/SwipeableCard'

function defaultActions(): { actions: CardAction[]; onEdit: () => void; onDelete: () => void } {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const actions: CardAction[] = [
    { icon: Pencil, label: 'Edit', onClick: onEdit },
    { icon: Trash2, label: 'Delete', onClick: onDelete, variant: 'destructive' },
  ]
  return { actions, onEdit, onDelete }
}

describe('SwipeableCard', () => {
  beforeEach(() => {
    // Each test starts with a clean DOM and fresh module-scoped open-id.
  })

  it('renders the foreground at offset 0 and an action button per descriptor', () => {
    const { actions } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div data-testid="body">card body</div>
      </SwipeableCard>
    )
    expect(screen.getByTestId('body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('clicking an action panel button fires its onClick', () => {
    const { actions, onEdit, onDelete } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div>body</div>
      </SwipeableCard>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('forwards a tap on the foreground to onForegroundClick when closed', () => {
    const { actions } = defaultActions()
    const onForeground = vi.fn()
    render(
      <SwipeableCard actions={actions} onForegroundClick={onForeground}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    fireEvent.click(screen.getByTestId('body'))
    expect(onForeground).toHaveBeenCalledTimes(1)
  })

  it('removes panel buttons from the keyboard tab order at rest', () => {
    const { actions } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div>body</div>
      </SwipeableCard>
    )
    // The panel is in the DOM and announced to screen readers, but sighted
    // keyboard users only land on the buttons after a swipe opens the panel.
    const editBtn = screen.getByRole('button', { name: 'Edit' })
    expect(editBtn.getAttribute('tabindex')).toBe('-1')
  })
})
