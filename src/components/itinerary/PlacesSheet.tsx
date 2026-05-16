import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceForm } from '@/components/places/PlaceForm'
import { PlacesBrowseList } from './PlacesBrowseList'
import { cn } from '@/lib/utils'
import { CITY_LABELS, getCityColor, type City } from '@/config/trip'
import type { PlaceRow } from '@/types/places'
import type { SelectPlaceHandler, SelectionOrigin } from '@/components/layout/AppShell'

const CITY_ORDER: City[] = ['tokyo', 'hakone', 'kyoto', 'naoshima', 'osaka']

type TabValue = 'add' | 'browse'

interface PlacesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fills the Add form's city and the Browse list's initial scope. */
  activeCity: City
  /** Unified place selection — used by Browse list and by the post-add toast's
   *  `View` action which deep-links to DetailPanel. */
  onSelectPlace: SelectPlaceHandler
  selectedPlace: PlaceRow | null
  selectionOrigin: SelectionOrigin | null
}

/**
 * Mobile-only tabbed bottom sheet behind the `AddFAB`:
 *
 *   • Add tab (default on every open) — `PlaceForm` pre-filled with
 *     `activeCity`. On success, sheet closes and a toast with a `View` action
 *     deep-links to the new place's DetailPanel.
 *   • Browse tab — current `PlacesBrowseList` body with a city-selector chip
 *     at the top defaulting to `activeCity`. Tapping a card closes the sheet
 *     and selects via `onSelectPlace(place, 'backlog')`.
 */
export function PlacesSheet({
  open,
  onOpenChange,
  activeCity,
  onSelectPlace,
  selectedPlace,
  selectionOrigin,
}: PlacesSheetProps) {
  const [tab, setTab] = useState<TabValue>('add')
  const [browseCity, setBrowseCity] = useState<City>(activeCity)

  // Reset every time the sheet (re-)opens. Add tab is the predictable default
  // and `browseCity` realigns with the active day's city.
  useEffect(() => {
    if (open) {
      setTab('add')
      setBrowseCity(activeCity)
    }
  }, [open, activeCity])

  function handleCreated(place: PlaceRow) {
    onOpenChange(false)
    toast.success(`Added ${place.name}`, {
      action: {
        label: 'View',
        onClick: () => onSelectPlace(place, 'marker'),
      },
    })
  }

  const handleSelectFromBrowse = ((place: PlaceRow | null, origin?: SelectionOrigin) => {
    if (place === null) {
      onSelectPlace(null)
      return
    }
    onOpenChange(false)
    onSelectPlace(place, origin ?? 'backlog')
  }) as SelectPlaceHandler

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl data-[side=bottom]:h-[85dvh] px-0 pt-3 pb-0 gap-2"
        showCloseButton={false}
      >
        <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <SheetTitle className="sr-only">Add or browse places</SheetTitle>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabValue)}
          className="flex flex-col flex-1 min-h-0 px-3 pb-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="add">Add</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="flex-1 min-h-0 overflow-y-auto pt-3">
            <PlaceForm
              defaultCity={activeCity}
              onSuccess={handleCreated}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>

          <TabsContent value="browse" className="flex flex-col flex-1 min-h-0 pt-3 gap-2">
            <div
              className="overflow-x-auto scrollbar-hide -mx-3 px-3"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex gap-1">
                {CITY_ORDER.map((c) => {
                  const isSelected = c === browseCity
                  const { primary } = getCityColor(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrowseCity(c)}
                      className={cn(
                        'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'text-white'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                      style={isSelected ? { backgroundColor: primary } : undefined}
                    >
                      {CITY_LABELS[c]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex-1 min-h-0 -mx-3 bg-muted/40 border-y">
              <PlacesBrowseList
                key={browseCity}
                city={browseCity}
                onSelectPlace={handleSelectFromBrowse}
                selectedPlace={selectedPlace}
                selectionOrigin={selectionOrigin}
                enableDrag={false}
              />
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
