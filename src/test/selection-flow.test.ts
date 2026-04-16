import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useCallback } from 'react'
import type { PlaceRow } from '@/types/places'
import type { SelectionOrigin, SelectPlaceHandler } from '@/components/layout/AppShell'

/**
 * Minimal reproduction of AppShell's selection state + auto-reveal logic.
 * Tests the handler contract without mounting the full component tree.
 */
function useSelectionFlow() {
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)
  const [selectionOrigin, setSelectionOrigin] = useState<SelectionOrigin | null>(null)
  const [mapVisible, setMapVisible] = useState(true)

  const handleSelectPlace = useCallback<SelectPlaceHandler>(
    ((place: PlaceRow | null, origin?: SelectionOrigin) => {
      setSelectedPlace(place)
      setSelectionOrigin(place ? (origin ?? null) : null)
      if (place && origin === 'backlog') {
        setMapVisible(true)
      }
    }) as SelectPlaceHandler,
    []
  )

  return { selectedPlace, selectionOrigin, mapVisible, setMapVisible, handleSelectPlace }
}

const PLACE: PlaceRow = {
  id: 'test-1',
  google_place_id: null,
  name: 'Test Place',
  address: null,
  lat: 35.0,
  lng: 139.0,
  rating: null,
  price_level: null,
  hours: null,
  website: null,
  phone: null,
  photos: null,
  category: 'attraction',
  tags: null,
  priority: 'want-to',
  status: 'researching',
  notes: null,
  city: 'tokyo',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('AppShell selection flow', () => {
  it('sets selectedPlace and origin on marker click', () => {
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.handleSelectPlace(PLACE, 'marker'))

    expect(result.current.selectedPlace).toBe(PLACE)
    expect(result.current.selectionOrigin).toBe('marker')
  })

  it('sets selectedPlace and origin on backlog click', () => {
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.handleSelectPlace(PLACE, 'backlog'))

    expect(result.current.selectedPlace).toBe(PLACE)
    expect(result.current.selectionOrigin).toBe('backlog')
  })

  it('sets selectedPlace and origin on day-column click', () => {
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.handleSelectPlace(PLACE, 'day-column'))

    expect(result.current.selectedPlace).toBe(PLACE)
    expect(result.current.selectionOrigin).toBe('day-column')
  })

  it('clears selection and origin when null is passed', () => {
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.handleSelectPlace(PLACE, 'marker'))
    expect(result.current.selectedPlace).toBe(PLACE)

    act(() => result.current.handleSelectPlace(null))
    expect(result.current.selectedPlace).toBeNull()
    expect(result.current.selectionOrigin).toBeNull()
  })

  it('auto-reveals map when backlog click happens while map is hidden', () => {
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.setMapVisible(false))
    expect(result.current.mapVisible).toBe(false)

    act(() => result.current.handleSelectPlace(PLACE, 'backlog'))
    expect(result.current.mapVisible).toBe(true)
    expect(result.current.selectedPlace).toBe(PLACE)
  })

  it('does NOT auto-reveal map on marker click (map is already visible to click a marker)', () => {
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.setMapVisible(false))
    act(() => result.current.handleSelectPlace(PLACE, 'marker'))

    // mapVisible stays false — only backlog triggers auto-reveal
    expect(result.current.mapVisible).toBe(false)
  })

  it('swaps selection when clicking a different place', () => {
    const other: PlaceRow = { ...PLACE, id: 'test-2', name: 'Other Place' }
    const { result } = renderHook(() => useSelectionFlow())

    act(() => result.current.handleSelectPlace(PLACE, 'marker'))
    expect(result.current.selectedPlace?.id).toBe('test-1')

    act(() => result.current.handleSelectPlace(other, 'day-column'))
    expect(result.current.selectedPlace?.id).toBe('test-2')
    expect(result.current.selectionOrigin).toBe('day-column')
  })
})
