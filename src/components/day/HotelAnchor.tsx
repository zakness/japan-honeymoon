import type { AccommodationRow } from '@/types/accommodations'
import type { CityColor } from '@/config/trip'

interface HotelAnchorProps {
  hotel: AccommodationRow
  slot: 'morning' | 'evening'
  colors: CityColor
  onViewOnMap?: () => void
}

export function HotelAnchor({ hotel, slot, colors, onViewOnMap }: HotelAnchorProps) {
  const emoji = slot === 'morning' ? '🌅' : '🛏️'
  const title = slot === 'morning' ? `Waking up at ${hotel.name}` : `Sleeping at ${hotel.name}`

  return (
    <div
      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium select-none"
      style={{ backgroundColor: colors.tint, color: colors.primary }}
      title={title}
    >
      <span className="text-sm">{emoji}</span>
      <span className="truncate flex-1">{hotel.name}</span>
      {onViewOnMap && (
        <button
          onClick={onViewOnMap}
          className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 underline underline-offset-2"
          style={{ color: colors.primary }}
        >
          Map
        </button>
      )}
    </div>
  )
}
