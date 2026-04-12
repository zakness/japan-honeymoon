import type { AccommodationRow } from '@/types/accommodations'

interface HotelAnchorProps {
  hotel: AccommodationRow
  slot: 'morning' | 'evening'
  color: string
  bgColor: string
  onViewOnMap?: () => void
}

export function HotelAnchor({ hotel, slot, color, bgColor, onViewOnMap }: HotelAnchorProps) {
  const label = slot === 'morning' ? `Waking up at ${hotel.name}` : `Sleeping at ${hotel.name}`

  return (
    <div
      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium select-none"
      style={{ backgroundColor: bgColor, color }}
      title="Hotel — cannot be moved"
    >
      <span className="text-sm">🏨</span>
      <span className="truncate flex-1">{label}</span>
      {onViewOnMap && (
        <button
          onClick={onViewOnMap}
          className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 underline underline-offset-2"
          style={{ color }}
        >
          Map
        </button>
      )}
    </div>
  )
}
