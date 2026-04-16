import { useState, useEffect, useRef } from 'react'
import { Map as GMap, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { PlaceMarker } from '@/components/map/PlaceMarker'
import { HotelMarker } from '@/components/map/HotelMarker'
import { PlaceDetailCard } from './PlaceDetailCard'
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
import type { SelectPlaceHandler } from '@/components/layout/AppShell'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'

const ALL = 'all'
const PAN_DURATION_MS = 500

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

interface CityMapContentProps {
  city: City
  dayDate: string | null
  selectedPlace: PlaceRow | null
  selectedHotel: AccommodationRow | null
  scheduleMap: globalThis.Map<string, string[]> | undefined
  onSelectPlace: SelectPlaceHandler
  onSelectHotel: (hotel: AccommodationRow | null) => void
}

function CityMapContent({
  city,
  dayDate,
  selectedPlace,
  selectedHotel,
  scheduleMap,
  onSelectPlace,
  onSelectHotel,
}: CityMapContentProps) {
  const map = useMap()
  const initializedCityRef = useRef<City | null>(null)

  const { data: places = [] } = usePlaces({
    city,
    dayDate: dayDate ?? undefined,
  })
  const { data: allHotels = [] } = useAccommodations()
  const hotels = allHotels.filter((h) => h.city === city)

  // Pan to city center whenever city changes
  useEffect(() => {
    if (!map || initializedCityRef.current === city) return
    const center = CITY_MAP_CENTER[city]
    map.moveCamera({ center: { lat: center.lat, lng: center.lng }, zoom: center.zoom })
    initializedCityRef.current = city
  }, [map, city])

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

  const hasSelection = !!selectedPlace || !!selectedHotel

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
      {/* Hotel InfoWindow stays — hotels are out of scope of the places
          unification. The place InfoWindow was retired in favor of
          `PlaceDetailCard`, rendered outside `<Map>` at the CityMap level. */}
      {selectedHotel?.lat && selectedHotel?.lng && (
        <InfoWindow
          position={{ lat: selectedHotel.lat, lng: selectedHotel.lng }}
          onCloseClick={() => onSelectHotel(null)}
          pixelOffset={[0, -40]}
        >
          <div className="min-w-[120px] py-0.5">
            <p className="text-sm font-semibold">{selectedHotel.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedHotel.check_in_date} → {selectedHotel.check_out_date}
            </p>
          </div>
        </InfoWindow>
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
}

export function CityMap({ city, selectedPlace, onSelectPlace, onEditPlace }: CityMapProps) {
  const [selectedDay, setSelectedDay] = useState<string>(ALL)
  const [selectedHotel, setSelectedHotel] = useState<AccommodationRow | null>(null)
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
    setSelectedHotel(null)
    setSelectedDay(ALL)
  }, [city, onSelectPlace])

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
            setSelectedHotel(null)
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
          setSelectedHotel(null)
        }}
      >
        <CityMapContent
          city={city}
          dayDate={selectedDay !== ALL ? selectedDay : null}
          selectedPlace={selectedPlace}
          selectedHotel={selectedHotel}
          scheduleMap={scheduleMap}
          onSelectPlace={onSelectPlace}
          onSelectHotel={setSelectedHotel}
        />
      </GMap>

      {/* Floating detail card for the selected place. Rendered outside the
          `<Map>` element so it's a normal React-positioned node over the map
          surface. Hotels still use the in-map `InfoWindow` above. */}
      {selectedPlace && (
        <PlaceDetailCard
          place={selectedPlace}
          onClose={() => onSelectPlace(null)}
          onEdit={() => onEditPlace(selectedPlace)}
        />
      )}
    </div>
  )
}
