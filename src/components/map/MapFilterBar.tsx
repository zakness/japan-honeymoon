import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PLACE_CATEGORIES,
  PLACE_PRIORITIES,
  type PlaceCategory,
  type PlacePriority,
} from '@/types/places'
import { TRIP_DAYS, CITY_LABELS, type City } from '@/config/trip'

const ALL = 'all'

export interface MapFilters {
  dayDate: string | typeof ALL
  category: PlaceCategory | typeof ALL
  priority: PlacePriority | typeof ALL
}

interface MapFilterBarProps {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
}

export function MapFilterBar({ filters, onChange }: MapFilterBarProps) {
  function set<K extends keyof MapFilters>(key: K, value: MapFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
      {/* Day filter */}
      <Select value={filters.dayDate} onValueChange={(v) => set('dayDate', v as string)}>
        <SelectTrigger className="h-8 text-xs bg-background/95 backdrop-blur shadow w-44">
          <SelectValue placeholder="All days" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All days</SelectItem>
          {TRIP_DAYS.map((day) => (
            <SelectItem key={day.date} value={day.date}>
              {day.date.slice(5)} — {day.cities.map((c) => CITY_LABELS[c as City]).join(' → ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      <Select
        value={filters.category}
        onValueChange={(v) => set('category', v as PlaceCategory | typeof ALL)}
      >
        <SelectTrigger className="h-8 text-xs bg-background/95 backdrop-blur shadow w-36">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {PLACE_CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.icon} {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={filters.priority}
        onValueChange={(v) => set('priority', v as PlacePriority | typeof ALL)}
      >
        <SelectTrigger className="h-8 text-xs bg-background/95 backdrop-blur shadow w-32">
          <SelectValue placeholder="All priorities" />
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
    </div>
  )
}
