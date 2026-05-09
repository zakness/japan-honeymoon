import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Trash2 } from 'lucide-react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { SortableItemCard, type CardAction } from '@/components/day/SortableItemCard'
import { setTestViewportWidth, resetTestViewport } from './setup'

function renderCard(ui: React.ReactElement) {
  return render(
    <DndContext>
      <SortableContext items={['card-1']}>{ui}</SortableContext>
    </DndContext>
  )
}

describe('SortableItemCard', () => {
  it('does not render a grip-handle button (whole card is the drag source)', () => {
    renderCard(
      <SortableItemCard id="card-1" data={{}}>
        <div>body</div>
      </SortableItemCard>
    )
    expect(screen.queryByLabelText(/drag to reorder/i)).toBeNull()
  })

  it('fires onCardClick when the content region is clicked', () => {
    const onCardClick = vi.fn()
    renderCard(
      <SortableItemCard id="card-1" data={{}} onCardClick={onCardClick}>
        <div data-testid="body">click target</div>
      </SortableItemCard>
    )
    fireEvent.click(screen.getByTestId('body'))
    expect(onCardClick).toHaveBeenCalledTimes(1)
  })

  it('tray button onClick fires without triggering onCardClick', () => {
    const onCardClick = vi.fn()
    const onAction = vi.fn()
    const actions: CardAction[] = [
      { icon: Trash2, label: 'tray', onClick: onAction, variant: 'destructive' },
    ]
    renderCard(
      <SortableItemCard id="card-1" data={{}} onCardClick={onCardClick} actions={actions}>
        <div>body</div>
      </SortableItemCard>
    )
    // Both desktop hover-tray and mobile swipe-panel render a button labeled
    // 'tray'; the test environment renders desktop (matchMedia defaults to
    // matching the desktop breakpoint via the jsdom shim).
    fireEvent.click(screen.getByRole('button', { name: 'tray' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onCardClick).not.toHaveBeenCalled()
  })

  it('does not render a clickable content wrapper when onCardClick is absent', () => {
    renderCard(
      <SortableItemCard id="card-1" data={{}}>
        <div data-testid="body">body</div>
      </SortableItemCard>
    )
    // The outer sortable div gets role="button" from dnd-kit's a11y attributes;
    // the inner content region should NOT also be role="button" when onCardClick
    // isn't provided.
    const innerClickable = screen.getByTestId('body').closest('[role="button"][tabindex="0"]')
    // The only matching ancestor should be the outer sortable div itself —
    // confirm by checking it carries dnd-kit's sortable aria attribute.
    expect(innerClickable?.getAttribute('aria-roledescription')).toBe('sortable')
  })

  describe('mobile branch', () => {
    afterEach(() => {
      resetTestViewport()
      cleanup()
    })

    it('renders the SwipeableCard wrapper and forwards a body tap as onCardClick', () => {
      setTestViewportWidth(375)
      const onCardClick = vi.fn()
      renderCard(
        <SortableItemCard id="card-1" data={{}} onCardClick={onCardClick}>
          <div data-testid="body">click target</div>
        </SortableItemCard>
      )
      // Mobile branch keeps actions accessible (tabindex toggles via swipe).
      // A tap on the body forwards to the swipeable's onForegroundClick.
      fireEvent.click(screen.getByTestId('body'))
      expect(onCardClick).toHaveBeenCalledTimes(1)
    })

    it('exposes mobile action buttons (rendered with tabIndex=-1 at rest)', () => {
      setTestViewportWidth(375)
      const onAction = vi.fn()
      const actions: CardAction[] = [
        { icon: Trash2, label: 'Delete', onClick: onAction, variant: 'destructive' },
      ]
      renderCard(
        <SortableItemCard id="card-1" data={{}} actions={actions}>
          <div>body</div>
        </SortableItemCard>
      )
      const btn = screen.getByRole('button', { name: 'Delete' })
      expect(btn.getAttribute('tabindex')).toBe('-1')
      // Clicking still fires (e.g. via accessibility tooling that bypasses
      // visual disclosure) — ensures the action wiring isn't accidentally
      // gated on the open state.
      fireEvent.click(btn)
      expect(onAction).toHaveBeenCalledTimes(1)
    })
  })
})
