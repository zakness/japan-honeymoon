import { cn } from '@/lib/utils'
import type { CityColor } from '@/config/trip'
import type { CategoryIcon } from '@/types/places'

type CardBannerOrientation = 'top' | 'side'

interface CardBannerProps {
  /** Primary photo URL. When absent, the banner shows a tinted fallback. */
  photoUrl?: string
  /** Already-resolved colors (city or per-hotel variant). Omit for a muted fallback. */
  colors?: CityColor
  /** Icon centered in the fallback block. */
  icon: CategoryIcon
  /**
   * Visual layout. `top` is the full-width header used by desktop cards and
   * the backlog. `side` is an 88px square used by the mobile day-column row
   * layout, where the banner sits to the left of the content.
   */
  orientation?: CardBannerOrientation
  /** Extra classes — primarily to override default sizing. */
  className?: string
}

/**
 * Cropped-image card anchor used by place cards, hotel cards, and day-column
 * cards. `orientation='top'` (default) renders a full-width header; `'side'`
 * renders an 88×88 square for the mobile list-row layout. When no photo is
 * available, a tinted block with the icon stands in.
 */
export function CardBanner({
  photoUrl,
  colors,
  icon: Icon,
  orientation = 'top',
  className,
}: CardBannerProps) {
  const sizingClass = orientation === 'side' ? 'h-[88px] w-[88px] shrink-0' : 'w-full h-20'

  if (photoUrl) {
    return (
      <div className={cn('overflow-hidden bg-muted', sizingClass, className)}>
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        sizingClass,
        !colors && 'bg-muted',
        className
      )}
      style={colors ? { backgroundColor: colors.tint } : undefined}
    >
      <Icon
        size={22}
        color={colors?.primary}
        className={!colors ? 'text-muted-foreground' : undefined}
      />
    </div>
  )
}
