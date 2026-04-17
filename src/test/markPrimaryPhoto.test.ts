import { describe, it, expect } from 'vitest'
import { markPrimaryPhoto } from '@/types/places'

describe('markPrimaryPhoto', () => {
  const photos = ['a.jpg', 'b.jpg', 'c.jpg']

  it('moves the selected url to the front', () => {
    expect(markPrimaryPhoto(photos, 'c.jpg')).toEqual(['c.jpg', 'a.jpg', 'b.jpg'])
  })

  it('returns the original array when already primary', () => {
    const result = markPrimaryPhoto(photos, 'a.jpg')
    expect(result).toBe(photos)
  })

  it('returns the original array when url is not in the list', () => {
    const result = markPrimaryPhoto(photos, 'missing.jpg')
    expect(result).toBe(photos)
  })

  it('preserves order of non-selected photos', () => {
    expect(markPrimaryPhoto(photos, 'b.jpg')).toEqual(['b.jpg', 'a.jpg', 'c.jpg'])
  })

  it('handles single-item arrays', () => {
    expect(markPrimaryPhoto(['only.jpg'], 'only.jpg')).toEqual(['only.jpg'])
  })
})
