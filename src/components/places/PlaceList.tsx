import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceCard } from './PlaceCard'
import { usePlaces, useChildCounts, useChildMustGoMap } from '@/hooks/usePlaces'
import { useUnscheduledPlaces } from '@/hooks/useItinerary'
import { PLACE_CATEGORIES, type PlaceRow, type PlaceCategory } from '@/types/places'
import { CITY_LABELS, type City } from '@/config/trip'

interface PlaceListProps {
  onSelectPlace?: (place: PlaceRow) => void
  selectedPlaceId?: string
}

const ALL = 'all'

type PlaceView = 'all' | 'unscheduled' | 'starred' | 'archived'

export function PlaceList({ onSelectPlace, selectedPlaceId }: PlaceListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | typeof ALL>(ALL)
  const [cityFilter, setCityFilter] = useState<City | typeof ALL>(ALL)
  const [view, setView] = useState<PlaceView>('all')

  const filterArgs = {
    category: categoryFilter !== ALL ? categoryFilter : undefined,
    city: cityFilter !== ALL ? cityFilter : undefined,
  }

  const { data: allPlaces, isLoading: loadingAll, error: errorAll } = usePlaces(filterArgs)
  const { data: unscheduled } = useUnscheduledPlaces()
  const { data: archivedPlaces, isLoading: loadingArchived } = usePlaces({
    ...filterArgs,
    includeArchived: 'only',
  })
  const { data: childCounts } = useChildCounts()
  const { data: childMustGoSet } = useChildMustGoMap()

  const places = useMemo(() => {
    switch (view) {
      case 'unscheduled': {
        // useUnscheduledPlaces ignores category/city filters — apply them here.
        return (unscheduled ?? []).filter((p) => {
          if (categoryFilter !== ALL && p.category !== categoryFilter) return false
          if (cityFilter !== ALL && p.city !== cityFilter) return false
          return true
        }) as PlaceRow[]
      }
      case 'starred':
        return (allPlaces ?? []).filter(
          (p) => p.priority === 'must_go' || (childMustGoSet?.has(p.id) ?? false)
        )
      case 'archived':
        return archivedPlaces ?? []
      case 'all':
      default:
        // `All` includes archived for parity with the backlog.
        return [...(allPlaces ?? []), ...(archivedPlaces ?? [])]
    }
  }, [view, allPlaces, unscheduled, archivedPlaces, categoryFilter, cityFilter, childMustGoSet])

  const isLoading = view === 'archived' ? loadingArchived : loadingAll
  const error = errorAll

  const filtered = useMemo(() => {
    const matches = places.filter(
      (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
    )
    // Must-gos to the top — same rule as the backlog so the upvote signal is
    // consistent across surfaces. Skip in starred/archived views — they're a
    // single priority bucket already.
    if (view === 'starred' || view === 'archived') return matches
    return [...matches].sort((a, b) => {
      const aMust = a.priority === 'must_go' ? 0 : 1
      const bMust = b.priority === 'must_go' ? 0 : 1
      return aMust - bMust
    })
  }, [places, search, view])

  const cities = Object.entries(CITY_LABELS) as [City, string][]

  return (
    <div className="flex flex-col gap-3">
      {/* View segmented control */}
      <Tabs value={view} onValueChange={(v) => setView(v as PlaceView)}>
        <TabsList className="w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unscheduled">Unscheduled</TabsTrigger>
          <TabsTrigger value="starred">Must go</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name…"
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as PlaceCategory | typeof ALL)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {PLACE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="inline-flex items-center gap-1.5">
                  <c.icon size={16} /> {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={(v) => setCityFilter(v as City | typeof ALL)}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cities</SelectItem>
            {cities.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </>
        )}
        {error && (
          <p className="text-sm text-destructive text-center py-4">Failed to load places</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {view === 'archived'
              ? 'Nothing archived yet'
              : view === 'starred'
                ? 'No starred places yet'
                : view === 'unscheduled'
                  ? 'All places are scheduled'
                  : places.length === 0
                    ? 'No places saved yet. Add your first place!'
                    : 'No places match your filters.'}
          </p>
        )}
        {filtered.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={place.id === selectedPlaceId}
            onClick={() => onSelectPlace?.(place)}
            childCount={childCounts?.get(place.id) ?? 0}
          />
        ))}
      </div>
    </div>
  )
}
