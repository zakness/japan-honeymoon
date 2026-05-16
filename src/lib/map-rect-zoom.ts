export interface PixelPoint {
  x: number
  y: number
}

export interface LatLngLiteral {
  lat: number
  lng: number
}

// Minimum diagonal pixel distance before a Shift+drag commits as a zoom.
// Anything smaller is treated as an accidental Shift+click.
export const MIN_DRAG_PX = 16

// Safety cap so a tiny rectangle doesn't blow past Google's max-zoom (21) and
// land on grey tiles. 20 is fine in the trip's cities (Tokyo/Kyoto/Osaka all
// have tile coverage past 20); 18 was over-conservative and made the gesture
// feel underzoomed.
export const MAX_ZOOM_AFTER_DRAW = 20

export function meetsMinDragSize(
  start: PixelPoint,
  end: PixelPoint,
  threshold = MIN_DRAG_PX
): boolean {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return Math.sqrt(dx * dx + dy * dy) >= threshold
}

/**
 * Snap a drag rectangle to the viewport's aspect ratio so it can become the
 * new viewport exactly. The snapped rectangle is centered on the drag's
 * bounding-box center and extends along whichever axis needed expansion to
 * match the viewport aspect. Without this, `fitBounds` on a rectangle whose
 * aspect differs from the viewport's gets dominated by the looser axis and
 * leaves a lot of slack — feels like "the zoom isn't responding."
 *
 * If either dimension of the drag is zero (e.g. perfectly horizontal or
 * vertical drag), returns the drag unchanged — the caller's min-size guard
 * will reject it.
 */
export function snapToViewportAspect(args: {
  start: PixelPoint
  end: PixelPoint
  containerWidth: number
  containerHeight: number
}): { start: PixelPoint; end: PixelPoint } {
  const { start, end, containerWidth, containerHeight } = args
  const dragW = Math.abs(end.x - start.x)
  const dragH = Math.abs(end.y - start.y)
  if (dragW === 0 || dragH === 0 || containerWidth === 0 || containerHeight === 0) {
    return { start, end }
  }
  const viewportAspect = containerWidth / containerHeight
  const dragAspect = dragW / dragH
  // Pick the smallest viewport-shaped rect that contains the drag.
  let snapW: number, snapH: number
  if (dragAspect >= viewportAspect) {
    // Drag is wider (relative to viewport) → width is the binding side.
    snapW = dragW
    snapH = dragW / viewportAspect
  } else {
    // Drag is taller → height is binding.
    snapH = dragH
    snapW = dragH * viewportAspect
  }
  const centerX = (start.x + end.x) / 2
  const centerY = (start.y + end.y) / 2
  return {
    start: { x: centerX - snapW / 2, y: centerY - snapH / 2 },
    end: { x: centerX + snapW / 2, y: centerY + snapH / 2 },
  }
}

/**
 * Convert a pair of container-pixel points (the start and end of a drag) into
 * a `{sw, ne}` lat/lng rectangle, using the current visible bounds of the map
 * and the container's pixel dimensions. The conversion is linear — Mercator
 * distortion within a single viewport at trip latitudes (~35°N) is sub-percent,
 * which is well within "zoom roughly to where I dragged" tolerances and avoids
 * the cost of standing up a `google.maps.OverlayView` just for projection math.
 *
 * Pixel Y is inverted: top of the container is north (higher latitude).
 */
export function pixelRectToLatLngBounds(args: {
  start: PixelPoint
  end: PixelPoint
  containerWidth: number
  containerHeight: number
  visibleSw: LatLngLiteral
  visibleNe: LatLngLiteral
}): { sw: LatLngLiteral; ne: LatLngLiteral } {
  const { start, end, containerWidth, containerHeight, visibleSw, visibleNe } = args
  const minX = Math.min(start.x, end.x)
  const maxX = Math.max(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const maxY = Math.max(start.y, end.y)

  const pixelToLat = (py: number) =>
    visibleNe.lat - (py / containerHeight) * (visibleNe.lat - visibleSw.lat)
  const pixelToLng = (px: number) =>
    visibleSw.lng + (px / containerWidth) * (visibleNe.lng - visibleSw.lng)

  return {
    sw: { lat: pixelToLat(maxY), lng: pixelToLng(minX) },
    ne: { lat: pixelToLat(minY), lng: pixelToLng(maxX) },
  }
}
