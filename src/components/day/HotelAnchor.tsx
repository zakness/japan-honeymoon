import { Hotel, BedDouble } from 'lucide-react'
import type { AccommodationRow } from '@/types/accommodations'
import type { CityColor } from '@/config/trip'

interface HotelAnchorProps {
  hotel: AccommodationRow
  /** Where in the day column the anchor sits — `start` for the wake-up slot
   *  at the top, `end` for the sleeping slot at the bottom. Drives icon and
   *  copy only; intentionally decoupled from the time-slot taxonomy so the
   *  hotel anchors aren't tied to specific meal/gap slots. */
  position: 'start' | 'end'
  colors: CityColor
  onSelect?: (hotel: AccommodationRow) => void
}

export function HotelAnchor({ hotel, position, colors, onSelect }: HotelAnchorProps) {
  const Icon = position === 'start' ? Hotel : BedDouble
  const title = position === 'start' ? `Waking up at ${hotel.name}` : `Sleeping at ${hotel.name}`

  const className =
    'flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium select-none w-full text-left'

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(hotel)}
        className={`${className} cursor-pointer hover:brightness-95 transition-[filter]`}
        style={{ backgroundColor: colors.tint, color: colors.primary }}
        title={title}
      >
        <Icon size={16} />
        <span className="truncate flex-1">{hotel.name}</span>
      </button>
    )
  }

  return (
    <div
      className={className}
      style={{ backgroundColor: colors.tint, color: colors.primary }}
      title={title}
    >
      <Icon size={16} />
      <span className="truncate flex-1">{hotel.name}</span>
    </div>
  )
}
