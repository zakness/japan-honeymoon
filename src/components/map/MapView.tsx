import { useState, useCallback, useEffect, useRef } from 'react'
import { Map, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { Plus, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceMarker } from './PlaceMarker'
import { HotelMarker } from './HotelMarker'
import { MapFilterBar, type MapFilters } from './MapFilterBar'
import { PlaceList } from '@/components/places/PlaceList'
import { PlaceForm } from '@/components/places/PlaceForm'
import { PlaceDetail } from '@/components/places/PlaceDetail'
import { HotelDetail } from '@/components/hotels/HotelDetail'
import { usePlaces } from '@/hooks/usePlaces'
import { usePlace } from '@/hooks/usePlaces'
import { useAccommodations } from '@/hooks/useAccommodations'
import { JAPAN_CENTER, JAPAN_DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/google-maps'
import type { PlaceRow, PlaceCategory, PlacePriority } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { NavState } from '@/components/layout/AppShell'

const ALL = 'all'

function MapContent({
  filters,
  selectedPlace,
  selectedHotel,
  onSelectPlace,
  onSelectHotel,
}: {
  filters: MapFilters
  selectedPlace: PlaceRow | null
  selectedHotel: AccommodationRow | null
  onSelectPlace: (place: PlaceRow | null) => void
  onSelectHotel: (hotel: AccommodationRow) => void
}) {
  const map = useMap()
  const coreLib = useMapsLibrary('core')
  const fittedRef = useRef(false)

  const { data: places = [] } = usePlaces({
    category: filters.category !== ALL ? (filters.category as PlaceCategory) : undefined,
    priority: filters.priority !== ALL ? (filters.priority as PlacePriority) : undefined,
    dayDate: filters.dayDate !== ALL ? filters.dayDate : undefined,
  })
  const { data: hotels = [] } = useAccommodations()

  const hasSelection = !!selectedPlace || !!selectedHotel

  // On first load, fit the map so all hotel markers are just in frame
  useEffect(() => {
    if (!map || !coreLib || hotels.length === 0 || fittedRef.current) return
    const bounds = new coreLib.LatLngBounds()
    for (const h of hotels) {
      if (h.lat && h.lng) bounds.extend({ lat: h.lat, lng: h.lng })
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60)
      fittedRef.current = true
    }
  }, [map, coreLib, hotels])

  function handlePlaceClick(place: PlaceRow) {
    onSelectPlace(place)
    if (map && place.lat && place.lng) {
      map.panTo({ lat: place.lat, lng: place.lng })
    }
  }

  function handleHotelClick(hotel: AccommodationRow) {
    onSelectHotel(hotel)
    if (map && hotel.lat && hotel.lng) {
      map.panTo({ lat: hotel.lat, lng: hotel.lng })
    }
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
          <div className="text-sm font-medium max-w-40">{selectedPlace.name}</div>
        </InfoWindow>
      )}
    </>
  )
}

interface MapViewProps {
  focusPlaceId?: string
  focusHotelId?: string
  onNavigate: (state: NavState) => void
}

export function MapView({ focusPlaceId, focusHotelId, onNavigate }: MapViewProps) {
  const [filters, setFilters] = useState<MapFilters>({
    dayDate: ALL,
    category: ALL,
    priority: ALL,
  })
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<AccommodationRow | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'list' | 'add'>('list')

  // If navigated here with a focusPlaceId, open the panel for that place
  const { data: focusPlace } = usePlace(focusPlaceId ?? null)
  useEffect(() => {
    if (focusPlace) {
      setSelectedPlace(focusPlace)
      setSelectedHotel(null)
      setPanelOpen(true)
      setPanelTab('list')
    }
  }, [focusPlace])

  // If navigated here with a focusHotelId, open the panel for that hotel
  const { data: allHotels = [] } = useAccommodations()
  useEffect(() => {
    if (!focusHotelId) return
    const hotel = allHotels.find((h) => h.id === focusHotelId) ?? null
    if (hotel) {
      setSelectedHotel(hotel)
      setSelectedPlace(null)
      setPanelOpen(true)
    }
  }, [focusHotelId, allHotels])

  const handleSelectPlace = useCallback(
    (place: PlaceRow) => {
      setSelectedPlace(place)
      setSelectedHotel(null)
      setPanelOpen(true)
      setPanelTab('list')
      onNavigate({ view: 'map', focusPlaceId: place.id })
    },
    [onNavigate]
  )

  const handleSelectHotel = useCallback(
    (hotel: AccommodationRow) => {
      setSelectedHotel(hotel)
      setSelectedPlace(null)
      setPanelOpen(true)
      onNavigate({ view: 'map', focusHotelId: hotel.id })
    },
    [onNavigate]
  )

  const handleClearSelection = useCallback(() => {
    setSelectedPlace(null)
    setSelectedHotel(null)
    onNavigate({ view: 'map' })
  }, [onNavigate])

  function handleAddNew() {
    setSelectedPlace(null)
    setSelectedHotel(null)
    setPanelTab('add')
    setPanelOpen(true)
    onNavigate({ view: 'map' })
  }

  // Determine what the sheet shows
  const showPlaceDetail = selectedPlace && panelTab === 'list'
  const showHotelDetail = selectedHotel && panelOpen

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background shrink-0">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              setSelectedPlace(null)
              setSelectedHotel(null)
              setPanelTab('list')
              setPanelOpen(true)
              onNavigate({ view: 'map' })
            }}
          >
            <List className="h-4 w-4" />
            Places
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            Add place
          </Button>
        </div>
        <MapFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <Map
          mapId={GOOGLE_MAP_ID || null}
          defaultCenter={JAPAN_CENTER}
          defaultZoom={JAPAN_DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="h-full w-full"
          onClick={() => handleClearSelection()}
        >
          <MapContent
            filters={filters}
            selectedPlace={selectedPlace}
            selectedHotel={selectedHotel}
            onSelectPlace={(p) => (p ? handleSelectPlace(p) : handleClearSelection())}
            onSelectHotel={handleSelectHotel}
          />
        </Map>

        <Sheet
          modal={false}
          open={panelOpen}
          onOpenChange={(open) => {
            if (!open) {
              setPanelOpen(false)
              setSelectedPlace(null)
              setSelectedHotel(null)
              onNavigate({ view: 'map' })
            }
          }}
        >
          <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto p-0">
            {showHotelDetail ? (
              <>
                <SheetHeader className="px-4 pt-4 pb-2">
                  <SheetTitle className="sr-only">Hotel details</SheetTitle>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground text-left"
                    onClick={() => {
                      setSelectedHotel(null)
                      onNavigate({ view: 'map' })
                    }}
                  >
                    ← Back
                  </button>
                </SheetHeader>
                <div className="px-4 pb-4">
                  <HotelDetail hotel={selectedHotel} />
                </div>
              </>
            ) : showPlaceDetail ? (
              <>
                <SheetHeader className="px-4 pt-4 pb-2">
                  <SheetTitle className="sr-only">Place details</SheetTitle>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground text-left"
                    onClick={() => {
                      setSelectedPlace(null)
                      onNavigate({ view: 'map' })
                    }}
                  >
                    ← All places
                  </button>
                </SheetHeader>
                <div className="px-4 pb-4">
                  <PlaceDetail
                    place={selectedPlace}
                    onClose={() => {
                      setSelectedPlace(null)
                      setPanelOpen(false)
                      onNavigate({ view: 'map' })
                    }}
                  />
                </div>
              </>
            ) : (
              <Tabs
                value={panelTab}
                onValueChange={(v) => setPanelTab(v as 'list' | 'add')}
                className="flex flex-col h-full"
              >
                <SheetHeader className="px-4 pt-4 pb-0">
                  <SheetTitle className="sr-only">Places</SheetTitle>
                  <TabsList className="w-full">
                    <TabsTrigger value="list" className="flex-1">
                      All places
                    </TabsTrigger>
                    <TabsTrigger value="add" className="flex-1">
                      Add place
                    </TabsTrigger>
                  </TabsList>
                </SheetHeader>
                <TabsContent value="list" className="flex-1 overflow-y-auto px-4 py-3">
                  <PlaceList
                    selectedPlaceId={selectedPlace?.id}
                    onSelectPlace={handleSelectPlace}
                  />
                </TabsContent>
                <TabsContent value="add" className="px-4 py-3">
                  <PlaceForm
                    onSuccess={(place) => {
                      setSelectedPlace(place)
                      setPanelTab('list')
                    }}
                    onCancel={() => setPanelTab('list')}
                  />
                </TabsContent>
              </Tabs>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
