import { describe, it, expect } from 'vitest'
import { buildStoragePath, extractStoragePath, TRIP_IMAGES_BUCKET } from '@/lib/storage'

describe('buildStoragePath', () => {
  it('composes `{kind}/{ownerId}/{filename}`', () => {
    expect(buildStoragePath('notes', 'abc-123', 'img.jpg')).toBe('notes/abc-123/img.jpg')
  })

  it('supports each owner kind', () => {
    expect(buildStoragePath('places', 'p1', 'x.jpg')).toBe('places/p1/x.jpg')
    expect(buildStoragePath('note-items', 'n1', 'x.jpg')).toBe('note-items/n1/x.jpg')
    expect(buildStoragePath('hotels', 'h1', 'x.jpg')).toBe('hotels/h1/x.jpg')
  })
})

describe('extractStoragePath', () => {
  const base = `https://project.supabase.co/storage/v1/object/public/${TRIP_IMAGES_BUCKET}/`

  it('returns the bucket-relative path for a supabase public URL', () => {
    expect(extractStoragePath(`${base}notes/abc/img.jpg`)).toBe('notes/abc/img.jpg')
  })

  it('returns null for non-supabase URLs', () => {
    expect(extractStoragePath('https://maps.googleapis.com/photo?x=1')).toBeNull()
  })

  it('returns null for URLs pointing at a different bucket', () => {
    const other = 'https://project.supabase.co/storage/v1/object/public/other-bucket/foo.jpg'
    expect(extractStoragePath(other)).toBeNull()
  })
})
