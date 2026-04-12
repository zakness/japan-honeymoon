import type { AccommodationRow } from '@/types/accommodations'

interface HotelAnchorProps {
  hotel: AccommodationRow
  slot: 'morning' | 'evening'
}

export function HotelAnchor({ hotel, slot }: HotelAnchorProps) {
  const label = slot === 'morning' ? `Waking up at ${hotel.name}` : `Sleeping at ${hotel.name}`

  return (
    <div
      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium select-none"
      style={{ backgroundColor: '#ede9fe', color: '#5b21b6' }}
      title="Hotel — cannot be moved"
    >
      <span className="text-sm">🏨</span>
      <span className="truncate">{label}</span>
    </div>
  )
}
