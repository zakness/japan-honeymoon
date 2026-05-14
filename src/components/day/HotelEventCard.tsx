import { LogIn, LogOut, Pencil } from 'lucide-react'
import { useAccommodations } from '@/hooks/useAccommodations'
import { getHotelColor } from '@/config/trip'
import { formatHotelTimePill, type ItineraryItemRow } from '@/types/itinerary'
import type { AccommodationRow } from '@/types/accommodations'
import { SortableItemCard, type CardAction } from './SortableItemCard'

interface HotelEventCardProps {
  /** The underlying itinerary item — its `accommodation_id` resolves the stay. */
  item: ItineraryItemRow
  /** `'checkin'` (uses `LogIn` + "Check in to …") or `'checkout'` (`LogOut` + "Check out of …"). */
  role: 'checkin' | 'checkout'
  dayDate: string
  /** Opens the shared DetailPanel for this hotel via AppShell's lifted handler. */
  onSelectHotel?: (hotel: AccommodationRow) => void
  /** Opens HotelEditDialog at AppShell level. */
  onEditHotel?: (hotel: AccommodationRow) => void
}

/**
 * Card surface for a hotel check-in or check-out event. Dispatched from
 * `ItineraryItem` when the row's `accommodation_id` is set. No banner — just a
 * leading event icon + hotel name + 4-state time pill, tinted with the hotel's
 * color so it reads as a hotel surface at a glance.
 *
 * Always renders `decided` — a booked stay's check-in/out isn't speculative;
 * only the time may be uncertain. Action tray is Edit-only (no delete: a stay's
 * check-in card can't exist without the stay, and deletion happens via the
 * hotel, not the card).
 */
export function HotelEventCard({
  item,
  role,
  dayDate,
  onSelectHotel,
  onEditHotel,
}: HotelEventCardProps) {
  const { data: allHotels = [] } = useAccommodations()
  const hotel = allHotels.find((h) => h.id === item.accommodation_id) ?? null

  if (!hotel) {
    // Race window: the accommodations query hasn't loaded yet (or this row
    // points at a stay that was just deleted). Render a tiny placeholder so
    // the slot height doesn't pop in/out.
    return (
      <SortableItemCard
        id={item.id}
        data={{ dayDate, kind: 'itinerary' as const, timeSlot: item.time_slot }}
        variant="decided"
      >
        <div className="text-xs text-muted-foreground">Hotel event…</div>
      </SortableItemCard>
    )
  }

  const colors = getHotelColor(hotel, allHotels)
  const Icon = role === 'checkin' ? LogIn : LogOut
  const title = role === 'checkin' ? `Check in to ${hotel.name}` : `Check out of ${hotel.name}`
  const pill = formatHotelTimePill({
    planned: role === 'checkin' ? hotel.check_in_time : hotel.check_out_time,
    policy: role === 'checkin' ? hotel.check_in_policy_time : hotel.check_out_policy_time,
    role,
  })

  const actions: CardAction[] = []
  if (onEditHotel) {
    actions.push({ icon: Pencil, label: 'Edit hotel', onClick: () => onEditHotel(hotel) })
  }

  return (
    <SortableItemCard
      id={item.id}
      data={{ dayDate, kind: 'itinerary' as const, timeSlot: item.time_slot }}
      actions={actions}
      variant="decided"
      accentColor={colors.primary}
      onCardClick={onSelectHotel ? () => onSelectHotel(hotel) : undefined}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <Icon size={14} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-medium leading-tight truncate">{title}</span>
          <span className="block mt-0.5 text-xs text-muted-foreground">{pill}</span>
        </div>
      </div>
    </SortableItemCard>
  )
}
