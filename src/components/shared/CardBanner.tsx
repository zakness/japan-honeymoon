import { cn } from '@/lib/utils'
import type { CityColor } from '@/config/trip'
import type { CategoryIcon } from '@/types/places'

interface CardBannerProps {
  /** Primary photo URL. When absent, the banner shows a tinted fallback. */
  photoUrl?: string
  /** Already-resolved colors (city or per-hotel variant). Omit for a muted fallback. */
  colors?: CityColor
  /** Icon centered in the fallback block. */
  icon: CategoryIcon
  /** Extra classes — primarily for height (default `h-20` ≈ 80px). */
  className?: string
}

/**
 * Full-width cropped-image header used by place cards, hotel cards, and
 * day-column cards to give every card a consistent visual anchor. When no
 * photo is available, a tinted block with the icon stands in.
 */
export function CardBanner({ photoUrl, colors, icon: Icon, className }: CardBannerProps) {
  if (photoUrl) {
    return (
      <div className={cn('w-full overflow-hidden bg-muted', className ?? 'h-20')}>
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        className ?? 'h-20',
        !colors && 'bg-muted'
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
