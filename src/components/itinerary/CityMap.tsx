import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Map as GMap, useMap } from '@vis.gl/react-google-maps'
import { PlaceMarker } from '@/components/map/PlaceMarker'
import { HotelMarker } from '@/components/map/HotelMarker'
import { TransportEndpointMarker } from '@/components/map/TransportEndpointMarker'
import { MapDrawZoomOverlay } from './MapDrawZoomOverlay'
import { usePlaces, useChildrenOf, useChildMustGoMap } from '@/hooks/usePlaces'
import { useAccommodations } from '@/hooks/useAccommodations'
import { useScheduledDatesByPlace, useUnscheduledPlaces } from '@/hooks/useItinerary'
import { CITY_MAP_CENTER, type City } from '@/config/trip'
import { GOOGLE_MAP_ID } from '@/lib/google-maps'
import { getModeStyle } from '@/config/transport'
import type { SelectPlaceHandler } from '@/components/layout/AppShell'
import type { PlaceRow } from '@/types/places'
import { hotelCoversDay, type AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'

export const ALL_DAYS = 'all'

/**
 * Decide what to relax when a selected place isn't currently visible. The
 * inputs are the place's scheduled dates (from `useScheduledDatesByPlace`),
 * the active day filter, and whether the unscheduled overlay is on.
 *
 *   • Scheduled on a day other than the filter → reset the filter to `all`.
 *   • Unscheduled while the overlay is off    → turn the overlay on.
 *   • Otherwise (already visible)              → null.
 */
export type AutoRelaxAction = { type: 'reset-day' } | { type: 'show-unscheduled' } | null

export function computeAutoRelaxAction(args: {
  scheduledDates: string[]
  selectedDay: string
  showUnscheduled: boolean
}): AutoRelaxAction {
  const { scheduledDates, selectedDay, showUnscheduled } = args
  const isScheduled = scheduledDates.length > 0
  if (isScheduled) {
    if (selectedDay !== ALL_DAYS && !scheduledDates.includes(selectedDay)) {
      return { type: 'reset-day' }
    }
    return null
  }
  if (!showUnscheduled) return { type: 'show-unscheduled' }
  return null
}
/** Imperative handle exposed by `<CityMap />` so the toolbar / floating
 *  controls can request a recenter (fit-bounds to currently-visible pins). */
export interface CityMapHandle {
  recenter: () => void
}
const PAN_DURATION_MS = 500
/** Symmetric padding (in pixels) for `fitBounds` calls — initial city framing
 *  and journey fits both use the same value, since the detail panel is now a
 *  sibling of the map and never occludes its viewport. */
const FIT_PADDING_PX = 60
const JOURNEY_FIT_PADDING_PX = 40

/**
 * Tracks the most recent in-flight pan animation so a subsequent pan or
 * `fitBounds` can cancel it. Without this, `smoothPanTo`'s rAF chain keeps
 * calling `moveCamera` for ~500ms after it starts; a `fitBounds` called
 * mid-animation gets overwritten on the next frame. Module-scoped because
 * only one map is mounted at a time.
 */
let panAnim: number | null = null

function cancelSmoothPan() {
  if (panAnim != null) {
    cancelAnimationFrame(panAnim)
    panAnim = null
  }
}

/**
 * Smooth-pan the map to `target` over a fixed duration (≤ 500ms). Google's
 * built-in `panTo` scales animation length with distance, which feels sluggish
 * for long-distance moves. This helper interpolates via `requestAnimationFrame`
 * so the move always completes within `PAN_DURATION_MS`. Cancels any prior
 * pan so consecutive calls don't fight each other.
 */
function smoothPanTo(map: google.maps.Map, target: google.maps.LatLngLiteral) {
  cancelSmoothPan()
  const start = map.getCenter()
  if (!start) {
    map.moveCamera({ center: target })
    return
  }
  const startLat = start.lat()
  const startLng = start.lng()
  const dLat = target.lat - startLat
  const dLng = target.lng - startLng

  // Skip animation for trivially small moves
  if (Math.abs(dLat) < 1e-6 && Math.abs(dLng) < 1e-6) return

  const t0 = performance.now()
  function step(now: number) {
    const elapsed = now - t0
    const t = Math.min(elapsed / PAN_DURATION_MS, 1)
    // ease-out quad for a natural deceleration feel
    const ease = 1 - (1 - t) * (1 - t)
    map.moveCamera({
      center: { lat: startLat + dLat * ease, lng: startLng + dLng * ease },
    })
    if (t < 1) panAnim = requestAnimationFrame(step)
    else panAnim = null
  }
  panAnim = requestAnimationFrame(step)
}

/**
 * Fit the map to a set of lat/lng pins with symmetric padding. Used for both
 * the initial city frame and the manual recenter button. Falls back to the
 * city's configured center/zoom when there are no pins, and pans at the city
 * zoom for a single pin (otherwise fitBounds zooms to street level).
 */
function fitToPins(
  map: google.maps.Map,
  pins: Array<{ lat: number; lng: number }>,
  cityForFallback: City
): void {
  const bounds = new google.maps.LatLngBounds()
  for (const p of pins) bounds.extend({ lat: p.lat, lng: p.lng })

  cancelSmoothPan()
  if (pins.length === 0) {
    const center = CITY_MAP_CENTER[cityForFallback]
    map.moveCamera({ center: { lat: center.lat, lng: center.lng }, zoom: center.zoom })
  } else if (pins.length === 1) {
    const center = CITY_MAP_CENTER[cityForFallback]
    map.moveCamera({ center: bounds.getCenter().toJSON(), zoom: center.zoom })
  } else {
    map.fitBounds(bounds, {
      top: FIT_PADDING_PX,
      right: FIT_PADDING_PX,
      bottom: FIT_PADDING_PX,
      left: FIT_PADDING_PX,
    })
  }
}

/** Fit the map to the bounds of a journey's leg endpoints. Returns false if
 *  the journey has no usable coordinates. */
function fitJourney(map: google.maps.Map, journey: Journey): boolean {
  const bounds = new google.maps.LatLngBounds()
  let added = 0
  for (const leg of journey.legs) {
    if (leg.origin_lat != null && leg.origin_lng != null) {
      bounds.extend({ lat: leg.origin_lat, lng: leg.origin_lng })
      added++
    }
    if (leg.destination_lat != null && leg.destination_lng != null) {
      bounds.extend({ lat: leg.destination_lat, lng: leg.destination_lng })
      added++
    }
  }
  if (added === 0) return false
  if (added === 1) {
    smoothPanTo(map, bounds.getCenter().toJSON())
    return true
  }
  cancelSmoothPan()
  map.fitBounds(bounds, {
    top: JOURNEY_FIT_PADDING_PX,
    right: JOURNEY_FIT_PADDING_PX,
    bottom: JOURNEY_FIT_PADDING_PX,
    left: JOURNEY_FIT_PADDING_PX,
  })
  return true
}

interface CityMapContentProps {
  city: City
  /** `'all'` shows every scheduled place in the city; a `YYYY-MM-DD` filters to
   *  that day. Only meaningful when `showScheduled` is true. */
  selectedDay: string
  /** When false, hide all scheduled-place pins (used by the mobile Places tab
   *  to show "unscheduled only"). */
  showScheduled: boolean
  /** When true, overlay the city's unscheduled-backlog pins on top of the
   *  scheduled subset. Orthogonal to the day filter. */
  showUnscheduled: boolean
  selectedPlace: PlaceRow | null
  selectedHotel: AccommodationRow | null
  selectedJourney: Journey | null
  scheduleMap: globalThis.Map<string, string[]> | undefined
  onSelectPlace: SelectPlaceHandler
  onSelectHotel: (hotel: AccommodationRow | null) => void
  onSelectJourney: (journey: Journey | null) => void
  /** Element wrapping the map; observed for size changes so we can re-pan
   *  the active selection after the parent layout grows or shrinks the map. */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** The outer `<CityMap />` writes the current recenter function here so its
   *  `useImperativeHandle` can call back into the in-provider closure. */
  recenterRef: React.MutableRefObject<(() => void) | null>
  /** Shared ref the inner content writes its `useMap()` instance to, so the
   *  Shift+drag overlay (rendered as a sibling of `<GMap>`) can call
   *  `getBounds()` / `fitBounds()` without standing up its own provider. */
  mapInstanceRef: React.MutableRefObject<google.maps.Map | null>
}

function CityMapContent({
  city,
  selectedDay,
  showScheduled,
  showUnscheduled,
  selectedPlace,
  selectedHotel,
  selectedJourney,
  scheduleMap,
  onSelectPlace,
  onSelectHotel,
  onSelectJourney,
  containerRef,
  recenterRef,
  mapInstanceRef,
}: CityMapContentProps) {
  const map = useMap()
  const initializedCityRef = useRef<City | null>(null)

  // Publish the map instance to the outer CityMap so the draw-zoom overlay
  // (sibling of `<GMap>`) can reach it without its own APIProvider context.
  useEffect(() => {
    mapInstanceRef.current = map ?? null
    return () => {
      mapInstanceRef.current = null
    }
  }, [map, mapInstanceRef])

  // Scheduled subset: filtered by day when a specific day is selected, else
  // restricted to places with at least one itinerary_items row in the city.
  // Disabled entirely when `showScheduled` is false (mobile Places tab mode).
  const scheduledQuery = usePlaces(
    showScheduled
      ? {
          city,
          dayDate: selectedDay !== ALL_DAYS ? selectedDay : undefined,
          scheduledOnly: selectedDay === ALL_DAYS,
        }
      : undefined
  )
  // Unscheduled overlay — the global backlog filtered client-side to the
  // current city. `useUnscheduledPlaces` doesn't accept a city param.
  const unscheduledQuery = useUnscheduledPlaces()
  // Merge scheduled + unscheduled sources, deduping by id (an entry could
  // appear in both if queries race during a transition).
  const scheduledData = scheduledQuery.data
  const unscheduledData = unscheduledQuery.data
  const places = useMemo(() => {
    const sched = showScheduled ? (scheduledData ?? []) : []
    const unsched = showUnscheduled ? (unscheduledData ?? []).filter((p) => p.city === city) : []
    if (unsched.length === 0) return sched
    const byId = new Map<string, PlaceRow>()
    for (const p of sched) byId.set(p.id, p)
    for (const p of unsched) byId.set(p.id, p)
    return Array.from(byId.values())
  }, [showScheduled, showUnscheduled, scheduledData, unscheduledData, city])
  const placesFetched =
    (!showScheduled || scheduledQuery.isFetched) && (!showUnscheduled || unscheduledQuery.isFetched)
  const accommodationsQuery = useAccommodations()
  const allHotels = accommodationsQuery.data ?? []
  const accommodationsFetched = accommodationsQuery.isFetched
  // Hotels respect the same map filter as places: hidden when the mobile
  // Places tab is active (scheduled content off) and, when a specific day is
  // selected, restricted to stays whose [check_in, check_out] range covers it.
  // The day filter resets to ALL_DAYS on city change, so a hotel selected from
  // the day-column or logistics never permanently disappears.
  const hotels = useMemo(() => {
    if (!showScheduled) return []
    const byCity = allHotels.filter((h) => h.city === city)
    if (selectedDay === ALL_DAYS) return byCity
    return byCity.filter((h) => hotelCoversDay(h, selectedDay))
  }, [allHotels, city, selectedDay, showScheduled])

  // Children of the selected parent — only fetched when something is selected.
  // Empty array when the selection has no children (or no selection).
  const { data: selectedChildren = [] } = useChildrenOf(selectedPlace?.id ?? null)
  // Map of parent-id → "any child is must-go". Drives the must-go badge OR-up
  // for parent markers.
  const { data: childMustGoSet } = useChildMustGoMap()

  // Currently-visible pins for fit-bounds operations (recenter button, initial
  // city frame, day-change re-fit). Scoped to the *currently-viewed* city —
  // important on transit days (e.g. May 22 = Tokyo & Hakone) where the
  // day-date query returns rows scheduled in both cities. Rendering still
  // draws every returned pin (so a transit-day Hakone marker can sit on the
  // Tokyo map for context), but recentering only frames the current city.
  // `hotels` is already city-filtered above; only `places` needs the extra
  // guard here.
  const visiblePins = useMemo<Array<{ lat: number; lng: number }>>(() => {
    const pins: Array<{ lat: number; lng: number }> = []
    for (const p of places) {
      if (p.city !== city) continue
      if (p.lat != null && p.lng != null) pins.push({ lat: p.lat, lng: p.lng })
    }
    for (const h of hotels) {
      if (h.lat != null && h.lng != null) pins.push({ lat: h.lat, lng: h.lng })
    }
    return pins
  }, [places, hotels, city])

  // Recenter: clear all three selections, then fit visible pins. Clearing the
  // selection before fitting prevents the ResizeObserver-driven auto-pan from
  // immediately yanking the map back to the (now stale) selection.
  const recenter = useCallback(() => {
    if (!map) return
    onSelectPlace(null)
    onSelectHotel(null)
    onSelectJourney(null)
    fitToPins(map, visiblePins, city)
  }, [map, visiblePins, city, onSelectPlace, onSelectHotel, onSelectJourney])
  useEffect(() => {
    recenterRef.current = recenter
    return () => {
      recenterRef.current = null
    }
  }, [recenter, recenterRef])

  // Tracks the day filter the camera was last fit to. Compared against
  // `selectedDay` in the re-fit effect below; the initial-frame effect also
  // writes here so the very first fit doesn't double as a day-change fit.
  const lastFittedDayRef = useRef<string>(selectedDay)

  // Frame the city on initial load (and on each city switch) by fitting the
  // currently-visible pins. Falls back to the configured CITY_MAP_CENTER if
  // there are none. The ref guard skips re-initialisation once a city has
  // been framed — subsequent re-fits go through the explicit recenter button
  // or the day-change re-fit effect below.
  useEffect(() => {
    if (!map || initializedCityRef.current === city) return
    if (!placesFetched || !accommodationsFetched) return
    fitToPins(map, visiblePins, city)
    initializedCityRef.current = city
    lastFittedDayRef.current = selectedDay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, city, visiblePins.length, placesFetched, accommodationsFetched])

  // Re-fit on day-filter change. Waits for the new query to settle so we
  // don't fit to stale data, and bails when a selection is active — the
  // pan-to-selection effect owns the camera in that case, and the auto-relax
  // path (place hidden by filter → reset to All) shouldn't yank the view away
  // from the just-picked marker.
  const hasSelection = !!(selectedPlace || selectedHotel || selectedJourney)
  useEffect(() => {
    if (!map || !placesFetched) return
    if (lastFittedDayRef.current === selectedDay) return
    if (showScheduled && scheduledQuery.isFetching) return
    lastFittedDayRef.current = selectedDay
    if (hasSelection) return
    fitToPins(map, visiblePins, city)
  }, [
    selectedDay,
    map,
    placesFetched,
    showScheduled,
    scheduledQuery.isFetching,
    visiblePins,
    city,
    hasSelection,
  ])

  // Pan to the selected place when the lifted selection changes. When the
  // selected place has children with coordinates, fit bounds over parent +
  // children instead of just panning — this is the "expand on select" behavior
  // that reveals the group's spatial footprint. Depending on primitive
  // id/lat/lng instead of the PlaceRow object means this effect only fires
  // when the selection actually changes.
  const selectedId = selectedPlace?.id ?? null
  const selectedLat = selectedPlace?.lat ?? null
  const selectedLng = selectedPlace?.lng ?? null
  // Stringified child-coords signature; depending on this primitive instead
  // of `selectedChildren` ensures the effect re-fits exactly when the
  // children data settles, not on every parent re-render.
  const childCoordsKey = selectedChildren
    .map((c) => `${c.id}:${c.lat ?? '_'}:${c.lng ?? '_'}`)
    .join('|')
  useEffect(() => {
    if (!map || !selectedId) return
    const childrenWithCoords = selectedChildren.filter((c) => c.lat != null && c.lng != null)
    if (childrenWithCoords.length > 0 && selectedLat != null && selectedLng != null) {
      // Cancel any in-flight pan from the previous effect run. On parent
      // selection, the first run typically pans to the parent (children
      // query still loading), then this second run lands when children data
      // settles — without cancelling, the rAF chain from the earlier pan
      // would overwrite this fitBounds on its next frame and the map would
      // end up zoomed to the parent only.
      cancelSmoothPan()
      const bounds = new google.maps.LatLngBounds()
      bounds.extend({ lat: selectedLat, lng: selectedLng })
      for (const c of childrenWithCoords) {
        bounds.extend({ lat: c.lat!, lng: c.lng! })
      }
      map.fitBounds(bounds, {
        top: FIT_PADDING_PX,
        right: FIT_PADDING_PX,
        bottom: FIT_PADDING_PX,
        left: FIT_PADDING_PX,
      })
      return
    }
    if (selectedLat && selectedLng) {
      smoothPanTo(map, { lat: selectedLat, lng: selectedLng })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedId, selectedLat, selectedLng, childCoordsKey])

  // Mirror the place-pan effect for hotel selection so day-column hotel
  // clicks (which set selectedHotel without going through the map) also pan.
  const selectedHotelId = selectedHotel?.id ?? null
  const selectedHotelLat = selectedHotel?.lat ?? null
  const selectedHotelLng = selectedHotel?.lng ?? null
  useEffect(() => {
    if (!map || !selectedHotelId) return
    if (selectedHotelLat && selectedHotelLng) {
      smoothPanTo(map, { lat: selectedHotelLat, lng: selectedHotelLng })
    }
  }, [map, selectedHotelId, selectedHotelLat, selectedHotelLng])

  // Fit bounds over all leg endpoints when a journey is selected.
  const journeyId = selectedJourney?.parent.id ?? null
  useEffect(() => {
    if (!map || !selectedJourney) return
    fitJourney(map, selectedJourney)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, journeyId])

  // Re-pan / re-fit the active selection when the map container resizes.
  // Without this, opening or closing the sibling DetailPanel — which shrinks
  // or grows the map — would leave the selected marker off-center (or the
  // journey route partially outside the new viewport). Debounced via rAF so
  // a transition spanning multiple frames only triggers one re-pan at the
  // settled size. Skipped during a city change (the city-init effect above
  // owns initial framing).
  useEffect(() => {
    if (!map) return
    const el = containerRef.current
    if (!el) return
    let raf = 0
    // Snap (no smoothPanTo animation) so the marker tracks a divider drag
    // 1:1. The 500ms ease in smoothPanTo is too sluggish for an interactive
    // resize and ends up fighting the pointer. Initial selection-change pans
    // still animate via the dedicated effects above.
    const observer = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (selectedJourney) {
          fitJourney(map, selectedJourney)
        } else if (selectedPlace?.lat != null && selectedPlace?.lng != null) {
          // If the selection has children with coords, re-fit bounds; else
          // just re-center on the parent.
          const childrenWithCoords = selectedChildren.filter((c) => c.lat != null && c.lng != null)
          if (childrenWithCoords.length > 0) {
            cancelSmoothPan()
            const bounds = new google.maps.LatLngBounds()
            bounds.extend({ lat: selectedPlace.lat, lng: selectedPlace.lng })
            for (const c of childrenWithCoords) {
              bounds.extend({ lat: c.lat!, lng: c.lng! })
            }
            map.fitBounds(bounds, {
              top: FIT_PADDING_PX,
              right: FIT_PADDING_PX,
              bottom: FIT_PADDING_PX,
              left: FIT_PADDING_PX,
            })
          } else {
            map.moveCamera({ center: { lat: selectedPlace.lat, lng: selectedPlace.lng } })
          }
        } else if (selectedHotel?.lat != null && selectedHotel?.lng != null) {
          map.moveCamera({ center: { lat: selectedHotel.lat, lng: selectedHotel.lng } })
        }
      })
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [map, containerRef, selectedJourney, selectedPlace, selectedHotel, selectedChildren])

  // Render per-leg polylines via the Maps API directly (vis.gl has no
  // <Polyline> primitive). Cleanup on unmount / journey change via setMap(null).
  useEffect(() => {
    if (!map || !selectedJourney) return
    const polylines: google.maps.Polyline[] = []
    for (const leg of selectedJourney.legs) {
      if (
        leg.origin_lat == null ||
        leg.origin_lng == null ||
        leg.destination_lat == null ||
        leg.destination_lng == null
      ) {
        continue
      }
      const { color, stroke } = getModeStyle(leg.mode)
      const isDashed = stroke === 'dashed'
      const isDotted = stroke === 'dotted'
      const polyline = new google.maps.Polyline({
        path: [
          { lat: leg.origin_lat, lng: leg.origin_lng },
          { lat: leg.destination_lat, lng: leg.destination_lng },
        ],
        geodesic: true,
        strokeColor: color,
        strokeOpacity: isDashed || isDotted ? 0 : 0.9,
        strokeWeight: 4,
        icons:
          isDashed || isDotted
            ? [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    strokeWeight: 4,
                    scale: isDotted ? 2 : 3,
                  },
                  offset: '0',
                  repeat: isDotted ? '10px' : '18px',
                },
              ]
            : undefined,
        map,
      })
      polylines.push(polyline)
    }
    return () => {
      for (const p of polylines) p.setMap(null)
    }
  }, [map, selectedJourney])

  function handlePlaceClick(place: PlaceRow) {
    onSelectPlace(place, 'marker')
    if (map && place.lat && place.lng) smoothPanTo(map, { lat: place.lat, lng: place.lng })
  }

  function handleHotelClick(hotel: AccommodationRow) {
    onSelectHotel(hotel)
    if (map && hotel.lat && hotel.lng) smoothPanTo(map, { lat: hotel.lat, lng: hotel.lng })
  }

  return (
    <>
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          selected={selectedPlace?.id === place.id}
          scheduledDayCount={scheduleMap?.get(place.id)?.length ?? 0}
          hasMustGoChild={childMustGoSet?.has(place.id) ?? false}
          onClick={handlePlaceClick}
        />
      ))}
      {/* Child markers — only rendered while the parent is selected. Compact
          (smaller, no badges) and subordinate to top-level markers. */}
      {selectedChildren.map((child) => (
        <PlaceMarker
          key={`child-${child.id}`}
          place={child}
          compact
          selected={false}
          onClick={handlePlaceClick}
        />
      ))}
      {hotels.map((hotel) => (
        <HotelMarker
          key={hotel.id}
          hotel={hotel}
          allHotels={allHotels}
          selected={selectedHotel?.id === hotel.id}
          onClick={handleHotelClick}
        />
      ))}
      {selectedJourney?.legs.map((leg) => (
        <JourneyEndpoints key={leg.id} leg={leg} />
      ))}
    </>
  )
}

function JourneyEndpoints({ leg }: { leg: Journey['legs'][number] }) {
  return (
    <>
      {leg.origin_lat != null && leg.origin_lng != null && (
        <TransportEndpointMarker
          lat={leg.origin_lat}
          lng={leg.origin_lng}
          mode={leg.mode}
          label={leg.origin_name}
        />
      )}
      {leg.destination_lat != null && leg.destination_lng != null && (
        <TransportEndpointMarker
          lat={leg.destination_lat}
          lng={leg.destination_lng}
          mode={leg.mode}
          label={leg.destination_name}
        />
      )}
    </>
  )
}

interface CityMapProps {
  city: City
  /** Unified place selection — owned by AppShell. */
  selectedPlace: PlaceRow | null
  /** Unified selection handler — routes clicks to AppShell. */
  onSelectPlace: SelectPlaceHandler
  /** Lifted to ItineraryView so day-column hotel clicks can drive map selection. */
  selectedHotel: AccommodationRow | null
  onSelectHotel: (hotel: AccommodationRow | null) => void
  /** Currently-selected journey — drives polylines, endpoint markers, fitBounds. */
  selectedJourney: Journey | null
  onSelectJourney: (journey: Journey | null) => void
  /** Day filter — owned by ItineraryView. `'all'` shows every scheduled place
   *  in the city; a `YYYY-MM-DD` filters to that day. */
  selectedDay: string
  /** Setter used by the auto-relax effect when a hidden place is selected. */
  onSelectDay: (day: string) => void
  /** When false, hide all scheduled-place pins (mobile Places tab). */
  showScheduled: boolean
  /** Overlay the city's unscheduled-backlog pins on top of the scheduled set. */
  showUnscheduled: boolean
  /** Setter used by the auto-relax effect when an unscheduled place is selected. */
  onShowUnscheduledChange: (v: boolean) => void
}

export const CityMap = forwardRef<CityMapHandle, CityMapProps>(function CityMap(
  {
    city,
    selectedPlace,
    onSelectPlace,
    selectedHotel,
    onSelectHotel,
    selectedJourney,
    onSelectJourney,
    selectedDay,
    onSelectDay,
    showScheduled,
    showUnscheduled,
    onShowUnscheduledChange,
  },
  ref
) {
  const { data: scheduleMap } = useScheduledDatesByPlace()
  const prevCityRef = useRef(city)
  const containerRef = useRef<HTMLDivElement>(null)
  const recenterRef = useRef<(() => void) | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  const handleDrawZoomClearSelections = useCallback(() => {
    onSelectPlace(null)
    onSelectHotel(null)
    onSelectJourney(null)
  }, [onSelectPlace, onSelectHotel, onSelectJourney])

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => recenterRef.current?.(),
    }),
    []
  )

  const center = CITY_MAP_CENTER[city]

  // Reset selection when city changes. Guarded so it only fires on actual
  // city *change* — not on initial mount or re-mount (e.g. when the map is
  // hidden then revealed via the auto-reveal feature). Day-filter reset on
  // city change is owned by ItineraryView.
  useEffect(() => {
    if (prevCityRef.current === city) return
    prevCityRef.current = city
    onSelectPlace(null)
    onSelectHotel(null)
    onSelectJourney(null)
  }, [city, onSelectPlace, onSelectHotel, onSelectJourney])

  // Auto-relax filter on a hidden selection: if the selected place is scheduled
  // on a different day, switch to `All`. If it's unscheduled and the overlay
  // is off, turn the overlay on. Keying on the primitive `selectedId` prevents
  // re-firing on every PlaceRow reference change.
  const selectedId = selectedPlace?.id ?? null
  useEffect(() => {
    if (!selectedId || !scheduleMap) return
    const action = computeAutoRelaxAction({
      scheduledDates: scheduleMap.get(selectedId) ?? [],
      selectedDay,
      showUnscheduled,
    })
    if (action?.type === 'reset-day') onSelectDay(ALL_DAYS)
    else if (action?.type === 'show-unscheduled') onShowUnscheduledChange(true)
  }, [selectedId, selectedDay, showUnscheduled, scheduleMap, onSelectDay, onShowUnscheduledChange])

  // Hotel-equivalent of the auto-relax above. Hotels are filtered by day too
  // (see CityMapContent), so a hotel selected from logistics or a day-column
  // can fall outside the current day filter. Reset to `All` so the marker
  // stays visible. Hotels have no unscheduled-overlay branch — they're always
  // "scheduled" content with fixed stay dates.
  const selectedHotelCovers =
    selectedHotel != null &&
    (selectedDay === ALL_DAYS || hotelCoversDay(selectedHotel, selectedDay))
  useEffect(() => {
    if (!selectedHotel) return
    if (!selectedHotelCovers) onSelectDay(ALL_DAYS)
  }, [selectedHotel, selectedHotelCovers, onSelectDay])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <GMap
        mapId={GOOGLE_MAP_ID || null}
        defaultCenter={{ lat: center.lat, lng: center.lng }}
        defaultZoom={center.zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        fullscreenControlOptions={{ position: 3 }}
        className="h-full w-full"
        onClick={() => {
          onSelectPlace(null)
          onSelectHotel(null)
          onSelectJourney(null)
        }}
      >
        <CityMapContent
          city={city}
          selectedDay={selectedDay}
          showScheduled={showScheduled}
          showUnscheduled={showUnscheduled}
          selectedPlace={selectedPlace}
          selectedHotel={selectedHotel}
          selectedJourney={selectedJourney}
          scheduleMap={scheduleMap}
          onSelectPlace={onSelectPlace}
          onSelectHotel={onSelectHotel}
          onSelectJourney={onSelectJourney}
          containerRef={containerRef}
          recenterRef={recenterRef}
          mapInstanceRef={mapInstanceRef}
        />
      </GMap>
      <MapDrawZoomOverlay
        mapRef={mapInstanceRef}
        containerRef={containerRef}
        onClearSelections={handleDrawZoomClearSelections}
      />
    </div>
  )
})
