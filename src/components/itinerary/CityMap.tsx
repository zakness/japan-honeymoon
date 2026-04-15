import { useState, useEffect, useRef } from 'react'
import { Map, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { PlaceMarker } from '@/components/map/PlaceMarker'
import { HotelMarker } from '@/components/map/HotelMarker'
import { PlaceInfoWindow } from './PlaceInfoWindow'
import { usePlaces } from '@/hooks/usePlaces'
import { useAccommodations } from '@/hooks/useAccommodations'
import {
  getDaysForCity,
  CITY_MAP_CENTER,
  CITY_LABELS,
  formatTripDayLabel,
  type City,
} from '@/config/trip'
import { GOOGLE_MAP_ID } from '@/lib/google-maps'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'

const ALL = 'all'

interface CityMapContentProps {
  city: City
  dayDate: string | null
  selectedPlace: PlaceRow | null
  selectedHotel: AccommodationRow | null
  onSelectPlace: (place: PlaceRow | null) => void
  onSelectHotel: (hotel: AccommodationRow | null) => void
}

function CityMapContent({
  city,
  dayDate,
  selectedPlace,
  selectedHotel,
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
    map.panTo({ lat: center.lat, lng: center.lng })
    map.setZoom(center.zoom)
    initializedCityRef.current = city
  }, [map, city])

  const hasSelection = !!selectedPlace || !!selectedHotel

  function handlePlaceClick(place: PlaceRow) {
    onSelectPlace(place)
    if (map && place.lat && place.lng) map.panTo({ lat: place.lat, lng: place.lng })
  }

  function handleHotelClick(hotel: AccommodationRow) {
    onSelectHotel(hotel)
    if (map && hotel.lat && hotel.lng) map.panTo({ lat: hotel.lat, lng: hotel.lng })
  }

  return (
    <>
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          selected={selectedPlace?.id === place.id}
          dimmed={hasSelection && selectedPlace?.id !== place.id}
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
      {selectedPlace?.lat && selectedPlace?.lng && (
        <InfoWindow
          position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
          onCloseClick={() => onSelectPlace(null)}
          pixelOffset={[0, -36]}
        >
          <PlaceInfoWindow place={selectedPlace} />
        </InfoWindow>
      )}
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
}

export function CityMap({ city }: CityMapProps) {
  const [selectedDay, setSelectedDay] = useState<string>(ALL)
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<AccommodationRow | null>(null)

  const cityDays = getDaysForCity(city)
  const center = CITY_MAP_CENTER[city]

  // Reset selection and day filter when city changes
  useEffect(() => {
    setSelectedPlace(null)
    setSelectedHotel(null)
    setSelectedDay(ALL)
  }, [city])

  return (
    <div className="relative h-full w-full">
      {/* Day filter overlay */}
      <div className="absolute top-2 left-2 z-10">
        <select
          value={selectedDay}
          onChange={(e) => {
            setSelectedDay(e.target.value)
            setSelectedPlace(null)
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

      <Map
        mapId={GOOGLE_MAP_ID || null}
        defaultCenter={{ lat: center.lat, lng: center.lng }}
        defaultZoom={center.zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControlOptions={{ style: 2, position: 3 }}
        fullscreenControlOptions={{ position: 3 }}
        className="h-full w-full"
        onClick={() => {
          setSelectedPlace(null)
          setSelectedHotel(null)
        }}
      >
        <CityMapContent
          city={city}
          dayDate={selectedDay !== ALL ? selectedDay : null}
          selectedPlace={selectedPlace}
          selectedHotel={selectedHotel}
          onSelectPlace={setSelectedPlace}
          onSelectHotel={setSelectedHotel}
        />
      </Map>
    </div>
  )
}
