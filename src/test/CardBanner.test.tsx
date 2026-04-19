import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StickyNote } from 'lucide-react'
import { CardBanner } from '@/components/shared/CardBanner'
import { getCityColor } from '@/config/trip'

const tokyo = getCityColor('tokyo')

describe('CardBanner', () => {
  it('renders an img when photoUrl is provided', () => {
    const { container } = render(
      <CardBanner photoUrl="https://example.com/x.jpg" colors={tokyo} icon={StickyNote} />
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', 'https://example.com/x.jpg')
  })

  it('renders an icon fallback when photoUrl is missing', () => {
    const { container } = render(<CardBanner colors={tokyo} icon={StickyNote} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('applies the provided className (for height overrides)', () => {
    const { container } = render(
      <CardBanner
        photoUrl="https://example.com/x.jpg"
        colors={tokyo}
        icon={StickyNote}
        className="h-16"
      />
    )
    expect(container.firstChild).toHaveClass('h-16')
  })

  it('renders a muted fallback when no colors are provided', () => {
    const { container } = render(<CardBanner icon={StickyNote} />)
    expect(container.firstChild).toHaveClass('bg-muted')
  })
})
