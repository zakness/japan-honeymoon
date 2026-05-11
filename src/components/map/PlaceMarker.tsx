import { Check, MapPin, Star } from 'lucide-react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { cn } from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/google-maps'
import { PLACE_CATEGORIES, type PlaceRow, type PlaceCategory } from '@/types/places'

interface PlaceMarkerProps {
  place: PlaceRow
  selected?: boolean
  /** Number of days this place is scheduled on. When >= 1 a corner badge renders. */
  scheduledDayCount?: number
  /** True when any nested child of this place has `priority = 'must_go'`. The
   *  badge ORs this with the place's own must-go so a parent reflects its
   *  group's must-go status even when only a child carries the flag. */
  hasMustGoChild?: boolean
  /** Compact = smaller scale, no badges. Used for child markers that appear
   *  when their parent is selected (subordinate to top-level markers). */
  compact?: boolean
  onClick: (place: PlaceRow) => void
}

export function PlaceMarker({
  place,
  selected,
  scheduledDayCount = 0,
  hasMustGoChild = false,
  compact = false,
  onClick,
}: PlaceMarkerProps) {
  if (!place.lat || !place.lng) return null

  const category = place.category as PlaceCategory
  const color = CATEGORY_COLORS[category] ?? '#6b7280'
  const Icon = PLACE_CATEGORIES.find((c) => c.value === category)?.icon ?? MapPin
  const isScheduled = scheduledDayCount > 0
  const isMustGo = place.priority === 'must_go' || hasMustGoChild
  // Single badge slot at top-right. Color encodes priority (gold = must-go,
  // foreground = neutral); symbol encodes coverage (✓ = scheduled,
  // ★ = unscheduled must-go). Default unscheduled places get no badge.
  // Compact (child) markers never show a badge — they're subordinate to the
  // parent's marker which already encodes the group's roll-up state.
  type BadgeKind = 'scheduled-mustgo' | 'scheduled' | 'mustgo-unscheduled' | null
  const badge: BadgeKind = compact
    ? null
    : isScheduled
      ? isMustGo
        ? 'scheduled-mustgo'
        : 'scheduled'
      : isMustGo
        ? 'mustgo-unscheduled'
        : null

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      onClick={() => onClick(place)}
      zIndex={selected ? 9999 : 1}
    >
      <div
        style={{
          transform: selected ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}
        className="relative cursor-pointer"
      >
        <div
          style={{
            backgroundColor: color,
            // Selected: thick white halo + softer outer shadow to lift it visually.
            boxShadow: selected
              ? '0 0 0 3px rgba(255,255,255,0.95), 0 4px 10px rgba(0,0,0,0.25)'
              : '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.15s ease',
          }}
          className={cn(
            'relative flex items-center justify-center rounded-full border-2 border-white text-sm',
            compact ? 'h-7 w-7' : 'h-8 w-8'
          )}
          title={place.name}
        >
          <Icon size={compact ? 13 : 14} color="white" />
        </div>
        {selected && (
          <div
            className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-xs font-medium text-foreground shadow-md ring-1 ring-black/5"
            aria-hidden
          >
            {place.name}
          </div>
        )}
        {badge && (
          <div
            className={cn(
              'pointer-events-none absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white shadow-sm',
              badge === 'scheduled' ? 'bg-foreground' : 'bg-amber-400'
            )}
            aria-label={
              badge === 'scheduled-mustgo'
                ? 'Must-go (scheduled)'
                : badge === 'scheduled'
                  ? 'Scheduled'
                  : 'Must-go (unscheduled)'
            }
            title={
              badge === 'scheduled-mustgo'
                ? 'Must-go · scheduled'
                : badge === 'scheduled'
                  ? 'Scheduled'
                  : 'Must-go'
            }
          >
            {badge === 'mustgo-unscheduled' ? (
              <Star className="h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
            ) : (
              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            )}
          </div>
        )}
      </div>
    </AdvancedMarker>
  )
}
