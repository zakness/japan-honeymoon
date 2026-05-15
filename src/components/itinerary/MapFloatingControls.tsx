import { Crosshair, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MapFloatingControlsProps {
  /** When false, the unscheduled-pill is hidden (e.g. on the Places tab where
   *  the map already shows the entire backlog). */
  showUnscheduledToggle: boolean
  showUnscheduled: boolean
  onShowUnscheduledChange: (v: boolean) => void
  onRecenter: () => void
}

/**
 * Mobile-only floating overlay on top of `CityMap`. The day filter is driven
 * by `DayStrip` so this overlay only carries the cross-cutting controls:
 *
 *   • top-left: compact pill toggling the unscheduled-backlog overlay.
 *   • top-right: small recenter icon button (matches Google Maps' own
 *     convention of locate-style controls on the right edge).
 *
 * Both surfaces are absolutely positioned inside the map's `relative` parent
 * so they sit on the map but don't steal any of its ~30dvh height budget.
 */
export function MapFloatingControls({
  showUnscheduledToggle,
  showUnscheduled,
  onShowUnscheduledChange,
  onRecenter,
}: MapFloatingControlsProps) {
  return (
    <>
      {showUnscheduledToggle && (
        <button
          type="button"
          onClick={() => onShowUnscheduledChange(!showUnscheduled)}
          aria-pressed={showUnscheduled}
          className={cn(
            'absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full border bg-background/95 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur transition-colors',
            showUnscheduled ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {showUnscheduled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Unscheduled
        </button>
      )}
      <button
        type="button"
        onClick={onRecenter}
        aria-label="Recenter map"
        className="absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/95 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
      >
        <Crosshair className="h-4 w-4" />
      </button>
    </>
  )
}
