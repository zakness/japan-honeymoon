import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddFABProps {
  onClick: () => void
  /** When true, the FAB renders hidden via opacity+pointer-events so the
   *  visibility transition can animate (DetailPanel open, sheet open, etc.). */
  hidden?: boolean
}

/**
 * Mobile-only floating action button anchored bottom-right of the itinerary
 * view. Tap → opens the tabbed `PlacesSheet` (defaults to the Add tab).
 *
 * Visibility is controlled by the caller (`ItineraryView`): hidden when the
 * DetailPanel is rendered (would overlap detail actions) and when either of
 * the bottom sheets is open (modal-over-FAB is visually noisy).
 */
export function AddFAB({ onClick, hidden = false }: AddFABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add place"
      className={cn(
        'absolute bottom-4 right-4 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg ring-1 ring-black/5 transition-all hover:bg-green-700 active:scale-95',
        hidden && 'opacity-0 pointer-events-none scale-90'
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
  )
}
