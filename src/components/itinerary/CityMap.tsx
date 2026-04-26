import { useState, useEffect, useRef } from 'react'
import { Map as GMap, useMap } from '@vis.gl/react-google-maps'
import { PlaceMarker } from '@/components/map/PlaceMarker'
import { HotelMarker } from '@/components/map/HotelMarker'
import { TransportEndpointMarker } from '@/components/map/TransportEndpointMarker'
import { PlaceDetailCard } from './PlaceDetailCard'
import { HotelDetailCard } from './HotelDetailCard'
import { TransportDetailCard } from './TransportDetailCard'
import { usePlaces } from '@/hooks/usePlaces'
import { useAccommodations } from '@/hooks/useAccommodations'
import { useScheduledDatesByPlace } from '@/hooks/useItinerary'
import {
  getDaysForCity,
  CITY_MAP_CENTER,
  CITY_LABELS,
  formatTripDayLabel,
  type City,
} from '@/config/trip'
import { GOOGLE_MAP_ID } from '@/lib/google-maps'
import { getModeStyle } from '@/config/transport'
import type { SelectPlaceHandler } from '@/components/layout/AppShell'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'

const ALL = 'all'
const PAN_DURATION_MS = 500
/**
 * Vertical offset (in pixels) applied when panning to a selected target so the
 * target sits in the lower-center of the viewport rather than dead center —
 * the top-right floating detail card would otherwise obscure the selection.
 */
const PAN_BOTTOM_BIAS_PX = 120

/**
 * Shift a lat/lng by a pixel offset at the map's current zoom. Used to offset
 * the pan target so the selection appears in the visible (un-obscured) area.
 */
function offsetLatLngByPixels(
  map: google.maps.Map,
  target: google.maps.LatLngLiteral,
  dxPx: number,
  dyPx: number
): google.maps.LatLngLiteral {
  const projection = map.getProjection()
  const zoom = map.getZoom()
  if (!projection || zoom == null) return target
  const scale = Math.pow(2, zoom)
  const point = projection.fromLatLngToPoint(target)
  if (!point) return target
  const shifted = new google.maps.Point(point.x + dxPx / scale, point.y + dyPx / scale)
  const latLng = projection.fromPointToLatLng(shifted)
  return latLng ? { lat: latLng.lat(), lng: latLng.lng() } : target
}

/**
 * Pixel offset to apply to a pan target so the visual obstruction doesn't
 * cover it.
 *  - Mobile (bottomPadPx > 0): sheet covers the BOTTOM, so push the target
 *    into the UPPER half by moving the camera SOUTH (positive dy).
 *  - Desktop (bottomPadPx === 0): floating detail card covers the TOP-RIGHT,
 *    so push the target into the LOWER half by moving the camera NORTH.
 */
function panBiasFor(bottomPadPx: number): number {
  return bottomPadPx > 0 ? Math.round(bottomPadPx / 2) : -PAN_BOTTOM_BIAS_PX
}

/**
 * Smooth-pan the map to `target` over a fixed duration (≤ 500ms). Google's
 * built-in `panTo` scales animation length with distance, which feels sluggish
 * for long-distance moves. This helper interpolates via `requestAnimationFrame`
 * so the move always completes within `PAN_DURATION_MS`. `dyPx` is the
 * vertical offset to bias the camera by (use `panBiasFor(bottomPadPx)`).
 */
function smoothPanTo(map: google.maps.Map, target: google.maps.LatLngLiteral, dyPx: number) {
  const biased = offsetLatLngByPixels(map, target, 0, dyPx)
  const start = map.getCenter()
  if (!start) {
    map.moveCamera({ center: biased })
    return
  }
  const startLat = start.lat()
  const startLng = start.lng()
  const dLat = biased.lat - startLat
  const dLng = biased.lng - startLng

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
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

interface CityMapContentProps {
  city: City
  dayDate: string | null
  selectedPlace: PlaceRow | null
  selectedHotel: AccommodationRow | null
  selectedJourney: Journey | null
  scheduleMap: globalThis.Map<string, string[]> | undefined
  onSelectPlace: SelectPlaceHandler
  onSelectHotel: (hotel: AccommodationRow | null) => void
  /**
   * Bottom obstruction (in CSS pixels) caused by an overlapping sheet. The map
   * uses this to bias initial city centering and journey fit-bounds padding so
   * pins/routes land in the visible upper portion rather than under the sheet.
   * 0 on desktop where nothing overlaps the map.
   */
  bottomPadPx: number
}

function CityMapContent({
  city,
  dayDate,
  selectedPlace,
  selectedHotel,
  selectedJourney,
  scheduleMap,
  onSelectPlace,
  onSelectHotel,
  bottomPadPx,
}: CityMapContentProps) {
  const map = useMap()
  const initializedCityRef = useRef<City | null>(null)

  const placesQuery = usePlaces({
    city,
    dayDate: dayDate ?? undefined,
  })
  const places = placesQuery.data ?? []
  const placesFetched = placesQuery.isFetched
  const accommodationsQuery = useAccommodations()
  const allHotels = accommodationsQuery.data ?? []
  const accommodationsFetched = accommodationsQuery.isFetched
  const hotels = allHotels.filter((h) => h.city === city)

  // Frame the city on initial load (and on each city switch) by fitting the
  // bounds of all known pins (places + hotels) for that city. This guarantees
  // the user sees their pins above the bottom sheet regardless of how the
  // city's geographic center happens to align with where pins actually are.
  // Falls back to the configured CITY_MAP_CENTER if the city has no pins.
  useEffect(() => {
    if (!map || initializedCityRef.current === city) return
    if (!placesFetched || !accommodationsFetched) return

    const bounds = new google.maps.LatLngBounds()
    let count = 0
    for (const p of places) {
      if (p.lat != null && p.lng != null) {
        bounds.extend({ lat: p.lat, lng: p.lng })
        count++
      }
    }
    for (const h of hotels) {
      if (h.lat != null && h.lng != null) {
        bounds.extend({ lat: h.lat, lng: h.lng })
        count++
      }
    }

    if (count === 0) {
      const center = CITY_MAP_CENTER[city]
      map.moveCamera({ center: { lat: center.lat, lng: center.lng }, zoom: center.zoom })
    } else if (count === 1) {
      // fitBounds on a single point would zoom to street level; pan to it
      // at the city's configured zoom instead.
      const center = CITY_MAP_CENTER[city]
      const only = bounds.getCenter().toJSON()
      map.moveCamera({ center: only, zoom: center.zoom })
      if (bottomPadPx > 0) map.panBy(0, bottomPadPx / 2)
    } else {
      map.fitBounds(bounds, {
        top: 60,
        right: 60,
        bottom: 60 + bottomPadPx,
        left: 60,
      })
    }
    initializedCityRef.current = city
    // `places`/`hotels` are derived arrays whose identity changes on every
    // TanStack refetch; depend on lengths instead so the effect only re-runs
    // when pin counts actually change. The ref guard skips re-initialisation
    // anyway once a city has been framed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, city, places.length, hotels.length, placesFetched, accommodationsFetched, bottomPadPx])

  // Pan to the selected place when the lifted selection changes. Depending on
  // primitive id/lat/lng instead of the PlaceRow object means this effect only
  // fires when the selection actually changes — not on every re-render where a
  // parent re-creates the row reference.
  const selectedId = selectedPlace?.id ?? null
  const selectedLat = selectedPlace?.lat ?? null
  const selectedLng = selectedPlace?.lng ?? null
  useEffect(() => {
    if (!map || !selectedId) return
    if (selectedLat && selectedLng) {
      smoothPanTo(map, { lat: selectedLat, lng: selectedLng }, panBiasFor(bottomPadPx))
    }
  }, [map, selectedId, selectedLat, selectedLng])

  // Mirror the place-pan effect for hotel selection so day-column hotel
  // clicks (which set selectedHotel without going through the map) also pan.
  const selectedHotelId = selectedHotel?.id ?? null
  const selectedHotelLat = selectedHotel?.lat ?? null
  const selectedHotelLng = selectedHotel?.lng ?? null
  useEffect(() => {
    if (!map || !selectedHotelId) return
    if (selectedHotelLat && selectedHotelLng) {
      smoothPanTo(map, { lat: selectedHotelLat, lng: selectedHotelLng }, panBiasFor(bottomPadPx))
    }
  }, [map, selectedHotelId, selectedHotelLat, selectedHotelLng])

  const hasSelection = !!selectedPlace || !!selectedHotel || !!selectedJourney

  // Fit bounds over all leg endpoints when a journey is selected.
  const journeyId = selectedJourney?.parent.id ?? null
  useEffect(() => {
    if (!map || !selectedJourney) return
    const bounds = new google.maps.LatLngBounds()
    let added = 0
    for (const leg of selectedJourney.legs) {
      if (leg.origin_lat != null && leg.origin_lng != null) {
        bounds.extend({ lat: leg.origin_lat, lng: leg.origin_lng })
        added++
      }
      if (leg.destination_lat != null && leg.destination_lng != null) {
        bounds.extend({ lat: leg.destination_lat, lng: leg.destination_lng })
        added++
      }
    }
    if (added === 0) return
    if (added === 1) {
      smoothPanTo(map, bounds.getCenter().toJSON(), panBiasFor(bottomPadPx))
      return
    }
    // Asymmetric padding: the bottom edge accounts for any sheet that
    // overlaps the map (mobile only), so the fitted route sits entirely in
    // the visible strip without needing a post-fit panBy hack.
    map.fitBounds(bounds, {
      top: 40,
      right: 40,
      bottom: 40 + bottomPadPx,
      left: 40,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, journeyId, bottomPadPx])

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
    if (map && place.lat && place.lng)
      smoothPanTo(map, { lat: place.lat, lng: place.lng }, panBiasFor(bottomPadPx))
  }

  function handleHotelClick(hotel: AccommodationRow) {
    onSelectHotel(hotel)
    if (map && hotel.lat && hotel.lng)
      smoothPanTo(map, { lat: hotel.lat, lng: hotel.lng }, panBiasFor(bottomPadPx))
  }

  return (
    <>
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          selected={selectedPlace?.id === place.id}
          dimmed={hasSelection && selectedPlace?.id !== place.id}
          scheduledDayCount={scheduleMap?.get(place.id)?.length ?? 0}
          onClick={handlePlaceClick}
        />
      ))}
      {hotels.map((hotel) => (
        <HotelMarker
          key={hotel.id}
          hotel={hotel}
          allHotels={allHotels}
          selected={selectedHotel?.id === hotel.id}
          dimmed={hasSelection && selectedHotel?.id !== hotel.id}
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
  /** Opens the edit dialog at AppShell level for the currently-selected place. */
  onEditPlace: (place: PlaceRow) => void
  /** Lifted to ItineraryView so day-column hotel clicks can drive map selection. */
  selectedHotel: AccommodationRow | null
  onSelectHotel: (hotel: AccommodationRow | null) => void
  /** Opens the edit dialog at AppShell level for the currently-selected hotel. */
  onEditHotel: (hotel: AccommodationRow) => void
  /** Currently-selected journey — drives polylines, endpoint markers, fitBounds. */
  selectedJourney: Journey | null
  onSelectJourney: (journey: Journey | null) => void
  /** Opens the edit dialog at AppShell level for the currently-selected journey. */
  onEditJourney: (journey: Journey) => void
  /**
   * CSS pixels of vertical obstruction at the bottom of the map (e.g. mobile
   * bottom sheet). Used to bias initial centering and journey fit-bounds so
   * pins/routes appear in the visible strip. Defaults to 0 (desktop).
   */
  bottomPadPx?: number
  /**
   * Render the floating detail cards (place/hotel/journey) over the map.
   * Default true. Mobile passes false because the bottom sheet renders the
   * same content and showing both at once would duplicate the UI.
   */
  showFloatingCards?: boolean
}

export function CityMap({
  city,
  selectedPlace,
  onSelectPlace,
  onEditPlace,
  selectedHotel,
  onSelectHotel,
  onEditHotel,
  selectedJourney,
  onSelectJourney,
  onEditJourney,
  bottomPadPx = 0,
  showFloatingCards = true,
}: CityMapProps) {
  const [selectedDay, setSelectedDay] = useState<string>(ALL)
  const { data: scheduleMap } = useScheduledDatesByPlace()
  const prevCityRef = useRef(city)

  const cityDays = getDaysForCity(city)
  const center = CITY_MAP_CENTER[city]

  // Reset selection and day filter when city changes. Guarded so it only fires
  // on actual city *change* — not on initial mount or re-mount (e.g. when the
  // map is hidden then revealed via the auto-reveal feature). Without this
  // guard, revealing the map after a backlog click would immediately clear the
  // selection that was just set.
  useEffect(() => {
    if (prevCityRef.current === city) return
    prevCityRef.current = city
    onSelectPlace(null)
    onSelectHotel(null)
    onSelectJourney(null)
    setSelectedDay(ALL)
  }, [city, onSelectPlace, onSelectHotel, onSelectJourney])

  // Filter auto-reset: if a day filter is active and the user selects a place
  // that isn't scheduled on that day, the marker wouldn't render and the card
  // would float orphaned. Reset the filter to ALL so the marker shows up.
  // Keying on the primitive `selectedId` prevents this from re-firing on
  // every PlaceRow reference change.
  const selectedId = selectedPlace?.id ?? null
  useEffect(() => {
    if (!selectedId || selectedDay === ALL) return
    const dates = scheduleMap?.get(selectedId) ?? []
    if (!dates.includes(selectedDay)) {
      setSelectedDay(ALL)
    }
  }, [selectedId, selectedDay, scheduleMap])

  return (
    <div className="relative h-full w-full">
      {/* Day filter overlay */}
      <div className="absolute top-2 left-2 z-10">
        <select
          value={selectedDay}
          onChange={(e) => {
            setSelectedDay(e.target.value)
            onSelectPlace(null)
            onSelectHotel(null)
            onSelectJourney(null)
          }}
          className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm focus:outline-none"
        >
          <option value={ALL}>All {CITY_LABELS[city]} days</option>
          {cityDays.map((day) => (
            <option key={day.date} value={day.date}>
              {formatTripDayLabel(day)}
            </option>
          ))}
        </select>
      </div>

      <GMap
        mapId={GOOGLE_MAP_ID || null}
        defaultCenter={{ lat: center.lat, lng: center.lng }}
        defaultZoom={center.zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControlOptions={{ style: 2, position: 3 }}
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
          dayDate={selectedDay !== ALL ? selectedDay : null}
          selectedPlace={selectedPlace}
          selectedHotel={selectedHotel}
          selectedJourney={selectedJourney}
          scheduleMap={scheduleMap}
          onSelectPlace={onSelectPlace}
          onSelectHotel={onSelectHotel}
          bottomPadPx={bottomPadPx}
        />
      </GMap>

      {/* Floating detail cards rendered outside the `<Map>` element so they're
          normal React-positioned nodes layered over the map surface. Place and
          hotel cards are mutually exclusive (enforced upstream in
          ItineraryView), so they share the same top-right slot. Suppressed on
          mobile (`showFloatingCards=false`) since the bottom sheet renders the
          same content. */}
      {showFloatingCards && selectedPlace && (
        <PlaceDetailCard
          place={selectedPlace}
          onClose={() => onSelectPlace(null)}
          onEdit={() => onEditPlace(selectedPlace)}
        />
      )}
      {showFloatingCards && selectedHotel && !selectedPlace && (
        <HotelDetailCard
          hotel={selectedHotel}
          onClose={() => onSelectHotel(null)}
          onEdit={() => onEditHotel(selectedHotel)}
        />
      )}
      {showFloatingCards && selectedJourney && !selectedPlace && !selectedHotel && (
        <TransportDetailCard
          journey={selectedJourney}
          onClose={() => onSelectJourney(null)}
          onEdit={() => onEditJourney(selectedJourney)}
        />
      )}
    </div>
  )
}
