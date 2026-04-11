import { useState, useCallback, useEffect } from 'react'
import { Map, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { Plus, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceMarker } from './PlaceMarker'
import { MapFilterBar, type MapFilters } from './MapFilterBar'
import { PlaceList } from '@/components/places/PlaceList'
import { PlaceForm } from '@/components/places/PlaceForm'
import { PlaceDetail } from '@/components/places/PlaceDetail'
import { usePlaces } from '@/hooks/usePlaces'
import { usePlace } from '@/hooks/usePlaces'
import { JAPAN_CENTER, JAPAN_DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/google-maps'
import type { PlaceRow, PlaceCategory, PlacePriority } from '@/types/places'
import type { NavState } from '@/components/layout/AppShell'

const ALL = 'all'

function MapContent({
  filters,
  selectedPlace,
  onSelectPlace,
}: {
  filters: MapFilters
  selectedPlace: PlaceRow | null
  onSelectPlace: (place: PlaceRow | null) => void
}) {
  const map = useMap()

  const { data: places = [] } = usePlaces({
    category: filters.category !== ALL ? (filters.category as PlaceCategory) : undefined,
    priority: filters.priority !== ALL ? (filters.priority as PlacePriority) : undefined,
    dayDate: filters.dayDate !== ALL ? filters.dayDate : undefined,
  })

  function handleMarkerClick(place: PlaceRow) {
    onSelectPlace(place)
    if (map && place.lat && place.lng) {
      map.panTo({ lat: place.lat, lng: place.lng })
    }
  }

  return (
    <>
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          selected={selectedPlace?.id === place.id}
          onClick={handleMarkerClick}
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'list' | 'add'>('list')

  // If navigated here with a focusPlaceId, open the panel for that place
  const { data: focusPlace } = usePlace(focusPlaceId ?? null)
  useEffect(() => {
    if (focusPlace) {
      setSelectedPlace(focusPlace)
      setPanelOpen(true)
      setPanelTab('list')
    }
  }, [focusPlace])

  const handleSelectPlace = useCallback((place: PlaceRow) => {
    setSelectedPlace(place)
    setPanelOpen(true)
    setPanelTab('list')
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedPlace(null)
  }, [])

  function handleAddNew() {
    setSelectedPlace(null)
    setPanelTab('add')
    setPanelOpen(true)
  }

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
          onSelectPlace={(p) => (p ? handleSelectPlace(p) : handleClearSelection())}
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
          {selectedPlace && panelTab === 'list' ? (
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
