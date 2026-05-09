import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { Pencil, Trash2 } from 'lucide-react'
import { SwipeableCard, type CardAction } from '@/components/day/SwipeableCard'
import { setTestViewportWidth, resetTestViewport } from './setup'

function defaultActions(): { actions: CardAction[]; onEdit: () => void; onDelete: () => void } {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const actions: CardAction[] = [
    { icon: Pencil, label: 'Edit', onClick: onEdit },
    { icon: Trash2, label: 'Delete', onClick: onDelete, variant: 'destructive' },
  ]
  return { actions, onEdit, onDelete }
}

// Stub the foreground container's width so threshold math is deterministic.
const CARD_WIDTH = 300
function stubCardWidth(width = CARD_WIDTH) {
  const original = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      width,
      height: 60,
      top: 0,
      left: 0,
      right: width,
      bottom: 60,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  }
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original
  }
}

function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientX: number,
  clientY = 0
) {
  fireEvent[
    type === 'pointerdown'
      ? 'pointerDown'
      : type === 'pointermove'
        ? 'pointerMove'
        : type === 'pointerup'
          ? 'pointerUp'
          : 'pointerCancel'
  ](target, {
    pointerId: 1,
    pointerType: 'touch',
    clientX,
    clientY,
    button: 0,
  })
}

describe('SwipeableCard', () => {
  let restoreRect: () => void

  beforeEach(() => {
    setTestViewportWidth(375)
    restoreRect = stubCardWidth()
  })
  afterEach(() => {
    restoreRect()
    resetTestViewport()
    cleanup()
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
    const editBtn = screen.getByRole('button', { name: 'Edit' })
    expect(editBtn.getAttribute('tabindex')).toBe('-1')
  })

  it('snaps back to closed when a swipe does not cross the commit threshold', () => {
    const { actions } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    const fg = screen.getByTestId('body').parentElement!
    // 40% of 300 = 120; swipe only 60px left.
    pointer(fg, 'pointerdown', 200, 30)
    pointer(fg, 'pointermove', 190, 30) // crosses 8px lock
    pointer(fg, 'pointermove', 140, 30) // ~60px past lock
    pointer(fg, 'pointerup', 140, 30)
    // Buttons stay non-tabbable → still closed.
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('-1')
  })

  it('opens past the commit threshold and announces; tapping panel button auto-closes', () => {
    const { actions, onEdit } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    const fg = screen.getByTestId('body').parentElement!
    // 40% of 300 = 120; swipe 200px left to commit.
    pointer(fg, 'pointerdown', 250, 30)
    pointer(fg, 'pointermove', 240, 30)
    pointer(fg, 'pointermove', 50, 30)
    pointer(fg, 'pointerup', 50, 30)
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    // After action click, panel snaps closed.
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('-1')
  })

  it('vertical-dominant motion bails the gesture (no offset change)', () => {
    const { actions } = defaultActions()
    const onForeground = vi.fn()
    render(
      <SwipeableCard actions={actions} onForegroundClick={onForeground}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    const fg = screen.getByTestId('body').parentElement!
    pointer(fg, 'pointerdown', 200, 50)
    pointer(fg, 'pointermove', 198, 80) // dy=30 dominates dx=2; bails
    pointer(fg, 'pointermove', 50, 200) // ignored — gesture released
    pointer(fg, 'pointerup', 50, 200)
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('-1')
  })

  it('the trailing click after a swipe-commit does not also close the panel', () => {
    const { actions } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    const fg = screen.getByTestId('body').parentElement!
    pointer(fg, 'pointerdown', 250, 30)
    pointer(fg, 'pointermove', 240, 30)
    pointer(fg, 'pointermove', 50, 30)
    pointer(fg, 'pointerup', 50, 30)
    // Now simulate the trailing synthesized click on the same target.
    fireEvent.click(fg)
    // Should still be open (panel buttons tabbable).
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('0')
  })

  it('tapping the foreground while open closes it AND does not fire onForegroundClick', () => {
    const { actions } = defaultActions()
    const onForeground = vi.fn()
    render(
      <SwipeableCard actions={actions} onForegroundClick={onForeground}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    const fg = screen.getByTestId('body').parentElement!
    // Open via swipe.
    pointer(fg, 'pointerdown', 250, 30)
    pointer(fg, 'pointermove', 240, 30)
    pointer(fg, 'pointermove', 50, 30)
    pointer(fg, 'pointerup', 50, 30)
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('0')
    // Trailing click from the swipe is consumed; now a fresh tap should close.
    fireEvent.click(fg)
    fireEvent.click(fg)
    expect(onForeground).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('-1')
  })

  it('opening one card snaps another open card closed via the shared subject', () => {
    const a = defaultActions()
    const b = defaultActions()
    render(
      <>
        <SwipeableCard actions={a.actions}>
          <div data-testid="body-a">A</div>
        </SwipeableCard>
        <SwipeableCard actions={b.actions}>
          <div data-testid="body-b">B</div>
        </SwipeableCard>
      </>
    )
    const fgA = screen.getByTestId('body-a').parentElement!
    const fgB = screen.getByTestId('body-b').parentElement!
    // Open A.
    pointer(fgA, 'pointerdown', 250, 30)
    pointer(fgA, 'pointermove', 240, 30)
    pointer(fgA, 'pointermove', 50, 30)
    pointer(fgA, 'pointerup', 50, 30)
    expect(a.actions[0].label).toBe('Edit')
    expect(screen.getAllByRole('button', { name: 'Edit' })[0].getAttribute('tabindex')).toBe('0')
    // Open B — A should snap closed.
    pointer(fgB, 'pointerdown', 250, 30)
    pointer(fgB, 'pointermove', 240, 30)
    pointer(fgB, 'pointermove', 50, 30)
    pointer(fgB, 'pointerup', 50, 30)
    const editButtons = screen.getAllByRole('button', { name: 'Edit' })
    // First Edit button (card A) closed; second (card B) open.
    expect(editButtons[0].getAttribute('tabindex')).toBe('-1')
    expect(editButtons[1].getAttribute('tabindex')).toBe('0')
  })

  it('a pointerdown outside the open card snaps it closed', () => {
    const { actions } = defaultActions()
    render(
      <div>
        <SwipeableCard actions={actions}>
          <div data-testid="body">body</div>
        </SwipeableCard>
        <button data-testid="outside">outside</button>
      </div>
    )
    const fg = screen.getByTestId('body').parentElement!
    pointer(fg, 'pointerdown', 250, 30)
    pointer(fg, 'pointermove', 240, 30)
    pointer(fg, 'pointermove', 50, 30)
    pointer(fg, 'pointerup', 50, 30)
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('0')
    act(() => {
      fireEvent.pointerDown(screen.getByTestId('outside'), {
        pointerId: 9,
        pointerType: 'mouse',
        button: 0,
      })
    })
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('-1')
  })

  it('pointercancel resets gesture state without committing', () => {
    const { actions } = defaultActions()
    render(
      <SwipeableCard actions={actions}>
        <div data-testid="body">body</div>
      </SwipeableCard>
    )
    const fg = screen.getByTestId('body').parentElement!
    pointer(fg, 'pointerdown', 250, 30)
    pointer(fg, 'pointermove', 240, 30)
    pointer(fg, 'pointermove', 50, 30)
    pointer(fg, 'pointercancel', 50, 30)
    // Did not commit; still closed.
    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('tabindex')).toBe('-1')
  })
})
