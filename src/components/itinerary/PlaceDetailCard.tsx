import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlaceDetailContent } from '@/components/places/PlaceDetail'
import type { PlaceRow } from '@/types/places'

interface PlaceDetailCardProps {
  place: PlaceRow
  onClose: () => void
  onEdit: () => void
  /**
   * Controls how the card positions itself. On desktop it's pinned to the
   * top-right corner of the map panel; on mobile it fills its parent
   * bottom-sheet slot (see `ItineraryView` mobile branch in Phase 3).
   */
  variant?: 'floating' | 'sheet'
}

/**
 * Floating detail card for a selected place. Renders over the map on desktop
 * and takes over the bottom-sheet slot on mobile. Closes on Escape or when the
 * X button is clicked. Actual place detail UI (photos, hours, actions) lives
 * in `PlaceDetailContent` — this wrapper just handles positioning, close, and
 * the keyboard shortcut.
 */
export function PlaceDetailCard({
  place,
  onClose,
  onEdit,
  variant = 'floating',
}: PlaceDetailCardProps) {
  // Escape-key dismiss. One listener, one place to maintain it.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const isFloating = variant === 'floating'

  return (
    <div
      className={
        isFloating
          ? 'absolute top-2 right-2 z-20 w-[360px] max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg border bg-background shadow-xl'
          : 'flex h-full w-full flex-col overflow-y-auto bg-background'
      }
      role="dialog"
      aria-label={`${place.name} details`}
    >
      {/* Close button — floats in the top-right of the card content */}
      <div className="sticky top-0 z-10 flex items-center justify-end bg-background/95 px-2 pt-2 backdrop-blur-sm">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-3 pb-3">
        <PlaceDetailContent place={place} onEdit={onEdit} onClose={onClose} />
      </div>
    </div>
  )
}
