import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PLACE_CATEGORIES, type PlaceRow, type PlacePriority } from '@/types/places'
import { CITY_LABELS, formatTripDateShort, getCityColor, type City } from '@/config/trip'
import { CardBanner } from '@/components/shared/CardBanner'

const PRIORITY_STYLES: Record<PlacePriority, string> = {
  'must-do': 'bg-red-100 text-red-700 border-red-200',
  'want-to': 'bg-blue-100 text-blue-700 border-blue-200',
  'if-time': 'bg-gray-100 text-gray-600 border-gray-200',
}

interface PlaceCardProps {
  place: PlaceRow
  onClick?: () => void
  selected?: boolean
  compact?: boolean
  scheduledDates?: string[]
}

export function PlaceCard({ place, onClick, selected, compact, scheduledDates }: PlaceCardProps) {
  const category = PLACE_CATEGORIES.find((c) => c.value === place.category)
  const photos = Array.isArray(place.photos) ? (place.photos as string[]) : []
  const priority = place.priority as PlacePriority
  const city = (place.city as City | null) ?? null
  const Icon = category?.icon
  const bannerHeight = compact ? 'h-16' : 'h-20'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border bg-card transition-colors overflow-hidden',
        selected
          ? 'border-primary ring-1 ring-primary'
          : 'hover:border-border/80 hover:bg-accent/30'
      )}
    >
      {Icon && (
        <CardBanner
          photoUrl={photos[0]}
          colors={city ? getCityColor(city) : undefined}
          icon={Icon}
          className={bannerHeight}
        />
      )}

      <div className={cn(compact ? 'p-2.5' : 'p-3')}>
        {/* Name + category icon */}
        <div className="flex items-start gap-1.5">
          {Icon && <Icon size={16} className="shrink-0 text-muted-foreground" />}
          <span className="font-medium text-sm leading-tight line-clamp-1">{place.name}</span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              PRIORITY_STYLES[priority]
            )}
          >
            {priority}
          </span>
          {place.city && (
            <Badge variant="outline" className="text-xs py-0 px-1.5">
              {CITY_LABELS[place.city as City] ?? place.city}
            </Badge>
          )}
          {place.rating && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {scheduledDates?.map((date) => (
            <Badge key={date} variant="secondary" className="text-[10px] py-0 px-1">
              {formatTripDateShort(date)}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  )
}
