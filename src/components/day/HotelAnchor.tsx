import { Hotel, BedDouble } from 'lucide-react'
import type { AccommodationRow } from '@/types/accommodations'
import type { CityColor } from '@/config/trip'

interface HotelAnchorProps {
  hotel: AccommodationRow
  slot: 'morning' | 'evening'
  colors: CityColor
  onSelect?: (hotel: AccommodationRow) => void
  /**
   * When true, drops the rounded corners so the banner can sit flush against
   * a parent's rounded edges (used by the mobile day-card layout where the
   * banner bleeds to the card edges).
   */
  bleed?: boolean
}

export function HotelAnchor({ hotel, slot, colors, onSelect, bleed = false }: HotelAnchorProps) {
  const Icon = slot === 'morning' ? Hotel : BedDouble
  const title = slot === 'morning' ? `Waking up at ${hotel.name}` : `Sleeping at ${hotel.name}`

  const className = `flex items-center gap-2 ${bleed ? '' : 'rounded-md'} px-3 py-2 text-xs font-medium select-none w-full text-left`

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
