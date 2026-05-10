import { Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useArchiveToggle } from '@/hooks/usePlaces'
import { PLACE_CATEGORIES, type PlaceRow } from '@/types/places'
import { formatTripDateShort, getCityColor, type City } from '@/config/trip'
import { CardBanner } from '@/components/shared/CardBanner'
import { StarToggle } from './StarToggle'

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
  const city = (place.city as City | null) ?? null
  const Icon = category?.icon
  const bannerHeight = compact ? 'h-16' : 'h-20'
  const isArchived = place.priority === 'archived'
  const archiveToggle = useArchiveToggle()

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-lg border bg-card transition-all overflow-hidden',
          selected
            ? 'border-primary ring-1 ring-primary'
            : 'hover:border-border/80 hover:bg-accent/30',
          isArchived && 'opacity-70 grayscale'
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

          {/* Badges row — only renders when there are scheduled dates to show.
              City pill removed: backlog and place list are now city-scoped, so
              the city was redundant on every card. */}
          {scheduledDates && scheduledDates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {scheduledDates.map((date) => (
                <Badge key={date} variant="secondary" className="text-[10px] py-0 px-1">
                  {formatTripDateShort(date)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </button>
      <StarToggle place={place} className="absolute top-2 left-2" />
      {/* Action tray: always visible while archived (so the toggle's pressed
          state is immediately legible); hover-reveal otherwise. */}
      <div
        className={cn(
          'absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-card/95 transition-opacity',
          isArchived ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 p-0 transition-colors',
            isArchived
              ? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
              : 'text-muted-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation()
            archiveToggle(place)
          }}
          aria-label={isArchived ? 'Unarchive' : 'Archive'}
          aria-pressed={isArchived}
          title={isArchived ? 'Unarchive' : 'Archive'}
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
