import { describe, it, expect } from 'vitest'
import {
  meetsMinDragSize,
  pixelRectToLatLngBounds,
  snapToViewportAspect,
} from '@/lib/map-rect-zoom'

describe('meetsMinDragSize', () => {
  it('rejects a Shift+click with zero drag', () => {
    expect(meetsMinDragSize({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(false)
  })

  it('rejects a sub-threshold drag', () => {
    // 10px diagonal — under the 16px default
    expect(meetsMinDragSize({ x: 100, y: 100 }, { x: 107, y: 107 })).toBe(false)
  })

  it('accepts a drag at exactly the threshold', () => {
    // 16px straight across
    expect(meetsMinDragSize({ x: 100, y: 100 }, { x: 116, y: 100 })).toBe(true)
  })

  it('accepts a clearly intentional drag', () => {
    expect(meetsMinDragSize({ x: 100, y: 100 }, { x: 300, y: 250 })).toBe(true)
  })

  it('honors a custom threshold', () => {
    expect(meetsMinDragSize({ x: 0, y: 0 }, { x: 5, y: 0 }, 3)).toBe(true)
    expect(meetsMinDragSize({ x: 0, y: 0 }, { x: 5, y: 0 }, 100)).toBe(false)
  })
})

describe('snapToViewportAspect', () => {
  const containerWidth = 1000
  const containerHeight = 500 // viewport aspect 2:1

  it('extends a wider-than-viewport drag along height (binding side is width)', () => {
    // 400x100 drag — wider aspect (4:1) than viewport (2:1). Width is binding;
    // height extends from 100 → 200 to hit 2:1.
    const snapped = snapToViewportAspect({
      start: { x: 100, y: 200 },
      end: { x: 500, y: 300 },
      containerWidth,
      containerHeight,
    })
    expect(Math.abs(snapped.end.x - snapped.start.x)).toBeCloseTo(400)
    expect(Math.abs(snapped.end.y - snapped.start.y)).toBeCloseTo(200)
  })

  it('extends a taller-than-viewport drag along width (binding side is height)', () => {
    // 100x300 drag — taller aspect (1:3) than viewport (2:1). Height is
    // binding; width extends from 100 → 600 to hit 2:1.
    const snapped = snapToViewportAspect({
      start: { x: 400, y: 100 },
      end: { x: 500, y: 400 },
      containerWidth,
      containerHeight,
    })
    expect(Math.abs(snapped.end.x - snapped.start.x)).toBeCloseTo(600)
    expect(Math.abs(snapped.end.y - snapped.start.y)).toBeCloseTo(300)
  })

  it('keeps the rectangle centered on the drag bounding-box center', () => {
    // Drag center is at (300, 250). Snapped rect should be centered there too.
    const snapped = snapToViewportAspect({
      start: { x: 200, y: 100 },
      end: { x: 400, y: 400 },
      containerWidth,
      containerHeight,
    })
    const centerX = (snapped.start.x + snapped.end.x) / 2
    const centerY = (snapped.start.y + snapped.end.y) / 2
    expect(centerX).toBeCloseTo(300)
    expect(centerY).toBeCloseTo(250)
  })

  it('leaves a drag that already matches viewport aspect untouched', () => {
    // 200x100 drag is already 2:1 — should return effectively the same box.
    const snapped = snapToViewportAspect({
      start: { x: 100, y: 100 },
      end: { x: 300, y: 200 },
      containerWidth,
      containerHeight,
    })
    expect(Math.abs(snapped.end.x - snapped.start.x)).toBeCloseTo(200)
    expect(Math.abs(snapped.end.y - snapped.start.y)).toBeCloseTo(100)
  })

  it('returns the drag unchanged when either axis is zero', () => {
    const drag = { start: { x: 100, y: 100 }, end: { x: 300, y: 100 } }
    expect(snapToViewportAspect({ ...drag, containerWidth, containerHeight })).toEqual(drag)
  })
})

describe('pixelRectToLatLngBounds', () => {
  // A 1000x500 map viewport covering a 1° square around Tokyo. Coordinates are
  // chosen so each pixel maps to a tidy 0.001°/0.002° step, making the
  // expectations easy to read.
  const visibleSw = { lat: 35.0, lng: 139.0 }
  const visibleNe = { lat: 36.0, lng: 140.0 }
  const containerWidth = 1000
  const containerHeight = 500

  it('orients SW and NE correctly regardless of drag direction', () => {
    // Drag from top-right to bottom-left should produce the same bounds as
    // dragging the opposite direction — the function normalizes.
    const a = pixelRectToLatLngBounds({
      start: { x: 800, y: 100 },
      end: { x: 200, y: 400 },
      containerWidth,
      containerHeight,
      visibleSw,
      visibleNe,
    })
    const b = pixelRectToLatLngBounds({
      start: { x: 200, y: 400 },
      end: { x: 800, y: 100 },
      containerWidth,
      containerHeight,
      visibleSw,
      visibleNe,
    })
    expect(a).toEqual(b)
  })

  it('inverts pixel Y so top = north and bottom = south', () => {
    // Top edge of the container should be at the NE latitude (36.0); bottom
    // edge should be at the SW latitude (35.0).
    const { sw, ne } = pixelRectToLatLngBounds({
      start: { x: 0, y: 0 },
      end: { x: 1000, y: 500 },
      containerWidth,
      containerHeight,
      visibleSw,
      visibleNe,
    })
    expect(ne.lat).toBeCloseTo(36.0)
    expect(sw.lat).toBeCloseTo(35.0)
    expect(sw.lng).toBeCloseTo(139.0)
    expect(ne.lng).toBeCloseTo(140.0)
  })

  it('rect snapped to viewport aspect maps cleanly to a viewport-aspect lat/lng box', () => {
    // 1000x500 viewport (aspect 2:1) on a 1°x1° visible region. A 200x200
    // drag centered at (500, 250) snaps to a 400x200 rect (expanded along
    // width to hit 2:1), which should fit-bounds to a 0.4° x 0.2° lat/lng
    // box centered on the viewport center.
    const snapped = snapToViewportAspect({
      start: { x: 400, y: 150 },
      end: { x: 600, y: 350 },
      containerWidth,
      containerHeight,
    })
    const { sw, ne } = pixelRectToLatLngBounds({
      start: snapped.start,
      end: snapped.end,
      containerWidth,
      containerHeight,
      visibleSw,
      visibleNe,
    })
    expect(ne.lng - sw.lng).toBeCloseTo(0.4)
    expect(ne.lat - sw.lat).toBeCloseTo(0.4) // 200/500 of 1° = 0.4°
    expect((sw.lng + ne.lng) / 2).toBeCloseTo(139.5)
    expect((sw.lat + ne.lat) / 2).toBeCloseTo(35.5)
  })

  it('maps a centered quarter-viewport to the center quarter of the bounds', () => {
    // x in [250, 750], y in [125, 375] is the centered half-by-half of the
    // viewport. The resulting lat/lng box should be the centered half of the
    // visible bounds: lng [139.25, 139.75], lat [35.25, 35.75].
    const { sw, ne } = pixelRectToLatLngBounds({
      start: { x: 250, y: 125 },
      end: { x: 750, y: 375 },
      containerWidth,
      containerHeight,
      visibleSw,
      visibleNe,
    })
    expect(sw.lng).toBeCloseTo(139.25)
    expect(ne.lng).toBeCloseTo(139.75)
    expect(sw.lat).toBeCloseTo(35.25)
    expect(ne.lat).toBeCloseTo(35.75)
  })
})
