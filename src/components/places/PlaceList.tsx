import { useState } from 'react'
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
import { PlaceCard } from './PlaceCard'
import { usePlaces } from '@/hooks/usePlaces'
import {
  PLACE_CATEGORIES,
  PLACE_PRIORITIES,
  type PlaceRow,
  type PlaceCategory,
  type PlacePriority,
} from '@/types/places'
import { CITY_LABELS, type City } from '@/config/trip'

interface PlaceListProps {
  onSelectPlace?: (place: PlaceRow) => void
  selectedPlaceId?: string
}

const ALL = 'all'

export function PlaceList({ onSelectPlace, selectedPlaceId }: PlaceListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | typeof ALL>(ALL)
  const [priorityFilter, setPriorityFilter] = useState<PlacePriority | typeof ALL>(ALL)
  const [cityFilter, setCityFilter] = useState<City | typeof ALL>(ALL)

  const { data: places, isLoading, error } = usePlaces({
    category: categoryFilter !== ALL ? categoryFilter : undefined,
    priority: priorityFilter !== ALL ? priorityFilter : undefined,
    city: cityFilter !== ALL ? cityFilter : undefined,
  })

  const filtered = places?.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const cities = Object.entries(CITY_LABELS) as [City, string][]

  return (
    <div className="flex flex-col gap-3">
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
      <div className="grid grid-cols-3 gap-2">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as PlaceCategory | typeof ALL)}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {PLACE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.icon} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PlacePriority | typeof ALL)}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {PLACE_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
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
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </>
        )}
        {error && (
          <p className="text-sm text-destructive text-center py-4">Failed to load places</p>
        )}
        {!isLoading && filtered?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {places?.length === 0 ? 'No places saved yet. Add your first place!' : 'No places match your filters.'}
          </p>
        )}
        {filtered?.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={place.id === selectedPlaceId}
            onClick={() => onSelectPlace?.(place)}
          />
        ))}
      </div>
    </div>
  )
}
