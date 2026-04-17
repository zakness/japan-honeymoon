import { cn } from '@/lib/utils'
import { getCityColor, type City } from '@/config/trip'
import type { CategoryIcon } from '@/types/places'

interface PlaceCardBannerProps {
  /** Primary photo URL. When absent, the banner shows a city-tinted fallback. */
  photoUrl?: string
  /** Drives the fallback color. `null` (unknown city) renders a muted tint. */
  city?: City | null
  /** Icon centered in the fallback block. Usually the place's category icon. */
  icon: CategoryIcon
  /** Extra classes — primarily for height (default `h-20` ≈ 80px). */
  className?: string
}

/**
 * Full-width cropped-image header used by `PlaceCard` and day-column cards to
 * give every card a consistent visual anchor. When no photo is available, a
 * city-tinted block with the category icon stands in, keeping card heights
 * uniform across a column.
 */
export function PlaceCardBanner({ photoUrl, city, icon: Icon, className }: PlaceCardBannerProps) {
  if (photoUrl) {
    return (
      <div className={cn('w-full overflow-hidden bg-muted', className ?? 'h-20')}>
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  const color = city ? getCityColor(city) : null
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        className ?? 'h-20',
        !color && 'bg-muted'
      )}
      style={color ? { backgroundColor: color.tint } : undefined}
    >
      <Icon
        size={22}
        color={color?.primary}
        className={!color ? 'text-muted-foreground' : undefined}
      />
    </div>
  )
}
