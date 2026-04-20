import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { SortableItemCard } from '@/components/day/SortableItemCard'

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
    renderCard(
      <SortableItemCard
        id="card-1"
        data={{}}
        onCardClick={onCardClick}
        actions={
          <button type="button" onClick={onAction}>
            tray
          </button>
        }
      >
        <div>body</div>
      </SortableItemCard>
    )
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
})
