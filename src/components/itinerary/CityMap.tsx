import { useState, useEffect, useRef } from 'react'
import { Map as GMap, useMap } from '@vis.gl/react-google-maps'
import { PlaceMarker } from '@/components/map/PlaceMarker'
import { HotelMarker } from '@/components/map/HotelMarker'
import { TransportEndpointMarker } from '@/components/map/TransportEndpointMarker'
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
/** Symmetric padding (in pixels) for `fitBounds` calls — initial city framing
 *  and journey fits both use the same value, since the detail panel is now a
 *  sibling of the map and never occludes its viewport. */
const FIT_PADDING_PX = 60
const JOURNEY_FIT_PADDING_PX = 40

/**
 * Smooth-pan the map to `target` over a fixed duration (≤ 500ms). Google's
 * built-in `panTo` scales animation length with distance, which feels sluggish
 * for long-distance moves. This helper interpolates via `requestAnimationFrame`
 * so the move always completes within `PAN_DURATION_MS`.
 */
function smoothPanTo(map: google.maps.Map, target: google.maps.LatLngLiteral) {
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
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
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
  dayDate: string | null
  selectedPlace: PlaceRow | null
  selectedHotel: AccommodationRow | null
  selectedJourney: Journey | null
  scheduleMap: globalThis.Map<string, string[]> | undefined
  onSelectPlace: SelectPlaceHandler
  onSelectHotel: (hotel: AccommodationRow | null) => void
  /** Element wrapping the map; observed for size changes so we can re-pan
   *  the active selection after the parent layout grows or shrinks the map. */
  containerRef: React.RefObject<HTMLDivElement | null>
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
  containerRef,
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
  // bounds of all known pins (places + hotels) for that city. Falls back to
  // the configured CITY_MAP_CENTER if the city has no pins.
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
      map.moveCamera({ center: bounds.getCenter().toJSON(), zoom: center.zoom })
    } else {
      map.fitBounds(bounds, {
        top: FIT_PADDING_PX,
        right: FIT_PADDING_PX,
        bottom: FIT_PADDING_PX,
        left: FIT_PADDING_PX,
      })
    }
    initializedCityRef.current = city
    // `places`/`hotels` are derived arrays whose identity changes on every
    // TanStack refetch; depend on lengths instead so the effect only re-runs
    // when pin counts actually change. The ref guard skips re-initialisation
    // anyway once a city has been framed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, city, places.length, hotels.length, placesFetched, accommodationsFetched])

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
      smoothPanTo(map, { lat: selectedLat, lng: selectedLng })
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
      smoothPanTo(map, { lat: selectedHotelLat, lng: selectedHotelLng })
    }
  }, [map, selectedHotelId, selectedHotelLat, selectedHotelLng])

  const hasSelection = !!selectedPlace || !!selectedHotel || !!selectedJourney

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
          map.moveCamera({ center: { lat: selectedPlace.lat, lng: selectedPlace.lng } })
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
  }, [map, containerRef, selectedJourney, selectedPlace, selectedHotel])

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
  /** Lifted to ItineraryView so day-column hotel clicks can drive map selection. */
  selectedHotel: AccommodationRow | null
  onSelectHotel: (hotel: AccommodationRow | null) => void
  /** Currently-selected journey — drives polylines, endpoint markers, fitBounds. */
  selectedJourney: Journey | null
  onSelectJourney: (journey: Journey | null) => void
}

export function CityMap({
  city,
  selectedPlace,
  onSelectPlace,
  selectedHotel,
  onSelectHotel,
  selectedJourney,
  onSelectJourney,
}: CityMapProps) {
  const [selectedDay, setSelectedDay] = useState<string>(ALL)
  const { data: scheduleMap } = useScheduledDatesByPlace()
  const prevCityRef = useRef(city)
  const containerRef = useRef<HTMLDivElement>(null)

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
    <div ref={containerRef} className="relative h-full w-full">
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
          containerRef={containerRef}
        />
      </GMap>
    </div>
  )
}
