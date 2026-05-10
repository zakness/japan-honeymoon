import { Star } from 'lucide-react'
import { useToggleMustGo } from '@/hooks/usePlaces'
import { cn } from '@/lib/utils'
import type { PlacePriority, PlaceRow } from '@/types/places'

interface StarToggleProps {
  place: Pick<PlaceRow, 'id' | 'priority'>
  /** Visual size variants. `sm` for cards, `md` for detail headers. */
  size?: 'sm' | 'md'
  /** Extra classes for the button (e.g. absolute positioning on a card). */
  className?: string
}

/**
 * Quick-toggle for the must-go upvote. Designed to overlay banners/photos at
 * top-left of every place card. High-contrast on/off states: starred renders
 * as a saturated amber pill with a white star; unstarred is a card-tinted pill
 * with a darker outlined star. Both have a backdrop blur + shadow so they read
 * on any underlying photo. Stops pointer/click propagation so the parent
 * card's click handler and drag listeners don't fire from a star tap. From
 * `archived`, starring also unarchives — see `useToggleMustGo`.
 */
export function StarToggle({ place, size = 'sm', className }: StarToggleProps) {
  const toggle = useToggleMustGo()
  const priority = place.priority as PlacePriority
  const isMustGo = priority === 'must_go'
  // Sized to match the desktop action-tray icons (h-6 w-6, 14px lucide) so the
  // always-visible star reads as one peer in the icon hierarchy, not louder.
  const dimensions = size === 'md' ? 'h-8 w-8' : 'h-6 w-6'
  const iconSize = size === 'md' ? 18 : 14

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        toggle.mutate({ id: place.id, current: priority })
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        '[--star-shadow:0_1px_2px_rgb(0_0_0/0.45)]',
        dimensions,
        isMustGo
          ? 'bg-amber-400 hover:bg-amber-500 backdrop-blur-sm'
          : 'bg-transparent ring-1 ring-inset ring-white/90 hover:bg-white/15 [filter:drop-shadow(var(--star-shadow))]',
        className
      )}
      title={isMustGo ? 'Unstar' : 'Mark as must-go'}
      aria-label={isMustGo ? 'Unstar place' : 'Mark place as must-go'}
      aria-pressed={isMustGo}
    >
      <Star
        size={iconSize}
        strokeWidth={isMustGo ? 0 : 2}
        className={cn(
          'transition-colors',
          isMustGo ? 'fill-white text-white' : 'fill-none text-white'
        )}
      />
    </button>
  )
}
