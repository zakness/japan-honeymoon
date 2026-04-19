import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HotelDetailContent } from '@/components/hotels/HotelDetailContent'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelDetailCardProps {
  hotel: AccommodationRow
  onClose: () => void
  onEdit: () => void
  variant?: 'floating' | 'sheet'
}

/**
 * Floating detail card for a selected hotel — mirrors `PlaceDetailCard`.
 * Replaces the legacy InfoWindow on the map.
 */
export function HotelDetailCard({
  hotel,
  onClose,
  onEdit,
  variant = 'floating',
}: HotelDetailCardProps) {
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
      aria-label={`${hotel.name} details`}
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
      <HotelDetailContent hotel={hotel} onEdit={onEdit} />
    </div>
  )
}
