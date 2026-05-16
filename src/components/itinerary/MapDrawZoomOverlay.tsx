import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_ZOOM_AFTER_DRAW,
  meetsMinDragSize,
  pixelRectToLatLngBounds,
  snapToViewportAspect,
  type PixelPoint,
} from '@/lib/map-rect-zoom'

interface MapDrawZoomOverlayProps {
  /** Shared ref to the live google.maps.Map instance, written by a
   *  `useMap()`-driven capture component inside `<GMap>`. */
  mapRef: React.RefObject<google.maps.Map | null>
  /** The map container (already `position: relative`); the overlay positions
   *  itself with `absolute inset-0` over the same area. */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Called right before the fit-bounds commit so the map's selection-driven
   *  effects can't yank the camera away from the user's just-drawn rectangle.
   *  Mirrors the recenter button's behavior. */
  onClearSelections: () => void
}

/**
 * Desktop Shift+drag-to-zoom. While Shift is held the overlay becomes
 * pointer-active and renders a rubber-band rectangle as the user drags. On
 * mouseup, fits the map to the rectangle and clamps the resulting zoom.
 *
 * No-op on touch (Shift doesn't exist) and effectively no-op on a stray
 * Shift+click (size threshold rejects accidental drags). Releasing Shift or
 * pressing Escape mid-drag cancels.
 */
export function MapDrawZoomOverlay({
  mapRef,
  containerRef,
  onClearSelections,
}: MapDrawZoomOverlayProps) {
  const [shiftHeld, setShiftHeld] = useState(false)
  const [drag, setDrag] = useState<{ start: PixelPoint; current: PixelPoint } | null>(null)
  // Mirror `drag` into a ref so the window-level mouseup handler sees the
  // latest value without re-subscribing on every drag mutation.
  const dragRef = useRef<typeof drag>(null)
  dragRef.current = drag

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true)
      else if (e.key === 'Escape' && dragRef.current) setDrag(null)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return
      setShiftHeld(false)
      // Releasing Shift mid-draw cancels — matches "Shift activates the mode."
      if (dragRef.current) setDrag(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
      setDrag((d) => (d ? { ...d, current: { x, y } } : null))
    }
    const onUp = () => {
      const d = dragRef.current
      setDrag(null)
      if (!d) return
      if (!meetsMinDragSize(d.start, d.current)) return
      const map = mapRef.current
      const rect = containerRef.current?.getBoundingClientRect()
      const bounds = map?.getBounds()
      const currentZoom = map?.getZoom()
      if (!map || !rect || !bounds || currentZoom == null) return
      const snapped = snapToViewportAspect({
        start: d.start,
        end: d.current,
        containerWidth: rect.width,
        containerHeight: rect.height,
      })
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      const target = pixelRectToLatLngBounds({
        start: snapped.start,
        end: snapped.end,
        containerWidth: rect.width,
        containerHeight: rect.height,
        visibleSw: { lat: sw.lat(), lng: sw.lng() },
        visibleNe: { lat: ne.lat(), lng: ne.lng() },
      })
      // Apply via setCenter + setZoom rather than fitBounds. fitBounds rounds
      // to the largest integer zoom level that fully contains the rectangle,
      // which leaves up to ~50% of the viewport as visible "padding" even
      // when the snap aspect matches exactly. The map uses vector tiles
      // (mapId is set), so fractional setZoom lands pixel-exact.
      const snapW = Math.abs(snapped.end.x - snapped.start.x)
      const zoomDelta = Math.log2(rect.width / snapW)
      const newZoom = Math.min(currentZoom + zoomDelta, MAX_ZOOM_AFTER_DRAW)
      const center = {
        lat: (target.sw.lat + target.ne.lat) / 2,
        lng: (target.sw.lng + target.ne.lng) / 2,
      }
      onClearSelections()
      map.setCenter(center)
      map.setZoom(newZoom)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, mapRef, containerRef, onClearSelections])

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!e.shiftKey) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      e.preventDefault()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setDrag({ start: point, current: point })
    },
    [containerRef]
  )

  // Shift+double-click → zoom out one level, centered on the click. Mirrors
  // Google Maps' (and every other web map's) native Shift+double-click. The
  // overlay swallows the underlying clicks while Shift is held, so we have
  // to wire the zoom-out ourselves rather than letting it fall through. The
  // two mousedowns of the double-click each start a zero-size drag that the
  // min-size guard rejects, so they're no-ops.
  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!e.shiftKey) return
      const map = mapRef.current
      const rect = containerRef.current?.getBoundingClientRect()
      const bounds = map?.getBounds()
      const currentZoom = map?.getZoom()
      if (!map || !rect || !bounds || currentZoom == null) return
      e.preventDefault()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      const lng = sw.lng() + (x / rect.width) * (ne.lng() - sw.lng())
      const lat = ne.lat() - (y / rect.height) * (ne.lat() - sw.lat())
      onClearSelections()
      map.setCenter({ lat, lng })
      map.setZoom(Math.max(0, currentZoom - 1))
    },
    [mapRef, containerRef, onClearSelections]
  )

  const active = shiftHeld || drag != null
  // The rendered rectangle mirrors what gets committed: the snap-to-viewport
  // shape, not the raw cursor box. Users see "this is exactly the new
  // viewport" rather than a rectangle that drifts from the final fit.
  const rectStyle = (() => {
    if (!drag) return null
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const snapped = snapToViewportAspect({
      start: drag.start,
      end: drag.current,
      containerWidth: rect.width,
      containerHeight: rect.height,
    })
    return {
      left: Math.min(snapped.start.x, snapped.end.x),
      top: Math.min(snapped.start.y, snapped.end.y),
      width: Math.abs(snapped.end.x - snapped.start.x),
      height: Math.abs(snapped.end.y - snapped.start.y),
    }
  })()

  return (
    <div
      className="absolute inset-0"
      style={{
        cursor: active ? 'crosshair' : 'default',
        pointerEvents: active ? 'auto' : 'none',
        userSelect: 'none',
        zIndex: 5,
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {rectStyle && rectStyle.width >= 1 && rectStyle.height >= 1 && (
        <div
          className="absolute border-2 border-dashed border-primary/80 bg-primary/15"
          style={rectStyle}
        />
      )}
    </div>
  )
}
