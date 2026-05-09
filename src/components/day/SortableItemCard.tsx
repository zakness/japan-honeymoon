import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/utils'
import { SwipeableCard, type CardAction } from './SwipeableCard'

export type { CardAction } from './SwipeableCard'

interface SortableItemCardProps {
  id: string
  data: Record<string, unknown>
  children: ReactNode
  /**
   * Card-level actions. Rendered as a hover-reveal icon tray on desktop and
   * as a swipe-to-reveal panel on mobile (`SwipeableCard`).
   */
  actions?: CardAction[]
  /**
   * Visual variant. `speculative` renders a dashed, faded card to distinguish
   * "maybe" items from locked-in plans. Defaults to `decided`.
   */
  variant?: 'decided' | 'speculative'
  /**
   * Hex color used to tint a `decided` card's border and shadow. Ignored for
   * speculative cards. Typically the city's `primary` color.
   */
  accentColor?: string
  /**
   * Optional banner. With `bannerOrientation='top'` (default) it renders as a
   * full-width header above the content row. With `'side'` it sits to the
   * left of the content as an 88px square.
   */
  banner?: ReactNode
  /** Where to place the banner. `top` is desktop; `side` is mobile list-row. */
  bannerOrientation?: 'top' | 'side'
  /**
   * When provided, the content region becomes clickable and this fires on click.
   * On mobile the foreground swallows the click while the swipe panel is open
   * (used to dismiss the panel) so we route this through the swipeable wrapper
   * instead of an inline click target.
   */
  onCardClick?: () => void
}

/**
 * Shared shell for draggable itinerary/transport cards.
 *
 * Desktop: sortable wrapper with whole-card drag, hover-reveal icon tray in
 * the top-right corner, click-to-select on the content region.
 *
 * Mobile: drag is disabled (sensors gated in `useCrossItineraryDnD`); actions
 * are reached via `SwipeableCard`'s left-swipe reveal panel; tap selects.
 */
export function SortableItemCard({
  id,
  data,
  children,
  actions,
  variant = 'decided',
  accentColor,
  banner,
  bannerOrientation = 'top',
  onCardClick,
}: SortableItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
  })
  const isDesktop = useIsDesktop()

  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
  }

  // Decided cards get a city-tinted border + colored shadow when an accent is
  // provided. Hex+alpha suffix: `55` ≈ 33% (border), `33` ≈ 20% (shadow).
  const style: React.CSSProperties =
    variant === 'decided' && accentColor
      ? {
          ...baseStyle,
          borderColor: `${accentColor}55`,
          boxShadow: `0 1px 3px 0 ${accentColor}33, 0 1px 2px -1px ${accentColor}33`,
        }
      : baseStyle

  // On mobile the foreground must be opaque so the swipe action panel
  // underneath is hidden at rest. Speculative gets bg-card on mobile (the
  // dashed border still distinguishes it) and stays bg-transparent on desktop.
  const variantBorderClass =
    variant === 'speculative' ? 'border-dashed border-muted-foreground/40' : ''
  const desktopBgClass =
    variant === 'speculative' ? 'bg-transparent' : accentColor ? 'bg-card' : 'bg-card shadow-sm'
  const mobileFgBgClass = accentColor || variant === 'speculative' ? 'bg-card' : 'bg-card shadow-sm'

  const inner =
    bannerOrientation === 'side' && banner ? (
      <div className="flex items-stretch">
        {banner}
        <div className="flex-1 min-w-0 p-2.5">{children}</div>
      </div>
    ) : (
      <>
        {banner}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 p-2.5">{children}</div>
        </div>
      </>
    )

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative rounded-lg border group overflow-hidden',
        'sm:cursor-grab sm:active:cursor-grabbing sm:touch-none',
        variantBorderClass,
        isDesktop && desktopBgClass
      )}
    >
      {isDesktop ? (
        <>
          {onCardClick ? (
            <div
              role="button"
              tabIndex={0}
              onClick={onCardClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onCardClick()
                }
              }}
            >
              {inner}
            </div>
          ) : (
            inner
          )}

          {actions && actions.length > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-card/95 opacity-0 group-hover:opacity-100 transition-opacity">
              {actions.map((action, idx) => {
                const Icon = action.icon
                const destructive = action.variant === 'destructive'
                return (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 w-6 p-0 text-muted-foreground',
                      destructive && 'hover:text-destructive'
                    )}
                    onClick={action.onClick}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <SwipeableCard
          actions={actions ?? []}
          foregroundClassName={mobileFgBgClass}
          onForegroundClick={onCardClick}
        >
          {inner}
        </SwipeableCard>
      )}
    </div>
  )
}
