import { useEffect } from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlaceDetailContent } from '@/components/places/PlaceDetail'
import { HotelDetailContent } from '@/components/hotels/HotelDetailContent'
import { TransportDetailContent } from './TransportDetailContent'
import type { PlaceRow } from '@/types/places'
import type { AccommodationRow } from '@/types/accommodations'
import type { Journey } from '@/types/transport'
import { cn } from '@/lib/utils'

export type DetailSelection =
  | { kind: 'place'; place: PlaceRow }
  | { kind: 'hotel'; hotel: AccommodationRow }
  | { kind: 'journey'; journey: Journey }

interface DetailPanelProps {
  selection: DetailSelection
  onClose: () => void
  onEdit: () => void
  className?: string
}

/**
 * Shared sibling-region container for selected-entity details. Owns the close
 * button, the ESC-to-close behavior, and an internal scroll. Layout (height,
 * positioning) is the parent's responsibility — this component just fills its
 * box.
 */
export function DetailPanel({ selection, onClose, onEdit, className }: DetailPanelProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const ariaLabel =
    selection.kind === 'place'
      ? `${selection.place.name} details`
      : selection.kind === 'hotel'
        ? `${selection.hotel.name} details`
        : 'Transport details'

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-y-auto bg-background flex flex-col',
        className
      )}
      role="dialog"
      aria-label={ariaLabel}
    >
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
        onClick={onClose}
        aria-label="Close details"
      >
        <X className="h-4 w-4" />
      </Button>

      {selection.kind === 'place' && (
        <PlaceDetailContent place={selection.place} onEdit={onEdit} onClose={onClose} />
      )}
      {selection.kind === 'hotel' && <HotelDetailContent hotel={selection.hotel} onEdit={onEdit} />}
      {selection.kind === 'journey' && (
        <>
          <TransportDetailContent journey={selection.journey} />
          <div className="px-3 pb-3 flex justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
