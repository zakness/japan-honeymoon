import { useState, useCallback, useEffect } from 'react'
import { Map, InfoWindow, useMap } from '@vis.gl/react-google-maps'
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

  const { data: places = [] } = usePlaces({
    category: filters.category !== ALL ? (filters.category as PlaceCategory) : undefined,
    priority: filters.priority !== ALL ? (filters.priority as PlacePriority) : undefined,
    dayDate: filters.dayDate !== ALL ? filters.dayDate : undefined,
  })
  const { data: hotels = [] } = useAccommodations()

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
          onClick={handlePlaceClick}
        />
      ))}
      {hotels.map((hotel) => (
        <HotelMarker
          key={hotel.id}
          hotel={hotel}
          selected={selectedHotel?.id === hotel.id}
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
  onNavigate: (state: NavState) => void
}

export function MapView({ focusPlaceId, onNavigate }: MapViewProps) {
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

  const handleSelectPlace = useCallback((place: PlaceRow) => {
    setSelectedPlace(place)
    setSelectedHotel(null)
    setPanelOpen(true)
    setPanelTab('list')
  }, [])

  const handleSelectHotel = useCallback((hotel: AccommodationRow) => {
    setSelectedHotel(hotel)
    setSelectedPlace(null)
    setPanelOpen(true)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedPlace(null)
    setSelectedHotel(null)
  }, [])

  function handleAddNew() {
    setSelectedPlace(null)
    setSelectedHotel(null)
    setPanelTab('add')
    setPanelOpen(true)
  }

  // Determine what the sheet shows
  const showPlaceDetail = selectedPlace && panelTab === 'list'
  const showHotelDetail = selectedHotel && panelOpen

  return (
    <div className="relative h-full w-full">
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

      <MapFilterBar filters={filters} onChange={setFilters} />

      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 shadow bg-background/95 backdrop-blur"
          onClick={() => {
            setSelectedPlace(null)
            setSelectedHotel(null)
            setPanelTab('list')
            setPanelOpen(true)
          }}
        >
          <List className="h-4 w-4" />
          Places
        </Button>
        <Button size="sm" className="gap-1.5 shadow" onClick={handleAddNew}>
          <Plus className="h-4 w-4" />
          Add place
        </Button>
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto p-0">
          {showHotelDetail ? (
            <>
              <SheetHeader className="px-4 pt-4 pb-2">
                <SheetTitle className="sr-only">Hotel details</SheetTitle>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground text-left"
                  onClick={() => setSelectedHotel(null)}
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
                  onClick={() => setSelectedPlace(null)}
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
                  }}
                  onAddToDay={(place) => {
                    setPanelOpen(false)
                    onNavigate({ view: 'day', focusPlaceId: place.id })
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
                <PlaceList selectedPlaceId={selectedPlace?.id} onSelectPlace={handleSelectPlace} />
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
  )
}
