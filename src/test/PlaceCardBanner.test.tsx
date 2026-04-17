import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StickyNote } from 'lucide-react'
import { PlaceCardBanner } from '@/components/places/PlaceCardBanner'

describe('PlaceCardBanner', () => {
  it('renders an img when photoUrl is provided', () => {
    const { container } = render(
      <PlaceCardBanner photoUrl="https://example.com/x.jpg" city="tokyo" icon={StickyNote} />
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', 'https://example.com/x.jpg')
  })

  it('renders an icon fallback when photoUrl is missing', () => {
    const { container } = render(<PlaceCardBanner city="tokyo" icon={StickyNote} />)
    // No img; but an svg (the lucide icon) should be present
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('applies the provided className (for height overrides)', () => {
    const { container } = render(
      <PlaceCardBanner
        photoUrl="https://example.com/x.jpg"
        city="tokyo"
        icon={StickyNote}
        className="h-16"
      />
    )
    expect(container.firstChild).toHaveClass('h-16')
  })

  it('renders a muted fallback when city is null', () => {
    const { container } = render(<PlaceCardBanner city={null} icon={StickyNote} />)
    expect(container.firstChild).toHaveClass('bg-muted')
  })
})
