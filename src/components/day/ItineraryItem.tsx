import { useState } from 'react'
import { Archive, StickyNote, Clock, Lock, Unlock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PLACE_CATEGORIES, type PlaceRow } from '@/types/places'
import { formatReservationTime, itemKind, type ItineraryItemWithPlace } from '@/types/itinerary'
import { getCityColor, getPrimaryCityForDate } from '@/config/trip'
import { useDeleteItineraryItem, useUpdateItineraryItem } from '@/hooks/useItinerary'
import { useArchiveWithUndo, useChildCounts } from '@/hooks/usePlaces'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { ReservationDialog } from './ReservationDialog'
import { TextNoteDialog } from './TextNoteDialog'
import { CardBanner } from '@/components/shared/CardBanner'
import { StarToggle } from '@/components/places/StarToggle'
import { SortableItemCard, type CardAction } from './SortableItemCard'
import { HotelEventCard } from './HotelEventCard'
import type { AccommodationRow } from '@/types/accommodations'

interface ItineraryItemProps {
  item: ItineraryItemWithPlace
  dayDate: string
  /**
   * Fires when the user clicks a scheduled place's name. The parent (DayColumn)
   * is expected to route this into AppShell's lifted selection handler with
   * `'day-column'` as the origin.
   */
  onSelectPlace?: (place: PlaceRow) => void
  /** Fires when a hotel-event card body is clicked. */
  onSelectHotel?: (hotel: AccommodationRow) => void
  /** Fires when the hotel-event card's Edit action is invoked. */
  onEditHotel?: (hotel: AccommodationRow) => void
}

export function ItineraryItem({
  item,
  dayDate,
  onSelectPlace,
  onSelectHotel,
  onEditHotel,
}: ItineraryItemProps) {
  // Hotel events render via a dedicated component — no banner, no reservation
  // affordances, no place-archive action. The dispatch is the whole point of
  // splitting render paths: the place/text-note branch below uses several
  // hooks that hotel events don't need, and rules-of-hooks demands we pick
  // one branch's component or the other, not conditionally call hooks within
  // a single one.
  const kind = itemKind(item)
  if (kind === 'hotel_checkin' || kind === 'hotel_checkout') {
    return (
      <HotelEventCard
        item={item}
        role={kind === 'hotel_checkin' ? 'checkin' : 'checkout'}
        dayDate={dayDate}
        onSelectHotel={onSelectHotel}
        onEditHotel={onEditHotel}
      />
    )
  }
  return <PlaceOrTextNoteItem item={item} dayDate={dayDate} onSelectPlace={onSelectPlace} />
}

interface PlaceOrTextNoteItemProps {
  item: ItineraryItemWithPlace
  dayDate: string
  onSelectPlace?: (place: PlaceRow) => void
}

function PlaceOrTextNoteItem({ item, dayDate, onSelectPlace }: PlaceOrTextNoteItemProps) {
  const deleteItem = useDeleteItineraryItem()
  const updateItem = useUpdateItineraryItem()
  const archivePlace = useArchiveWithUndo()
  const isDesktop = useIsDesktop()
  const [reservationOpen, setReservationOpen] = useState(false)
  const [textNoteOpen, setTextNoteOpen] = useState(false)
  const { data: childCounts } = useChildCounts()
  const childCount = item.place ? (childCounts?.get(item.place.id) ?? 0) : 0

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync({ id: item.id, dayDate })
    } catch {
      toast.error('Failed to remove item')
    }
  }

  async function handleToggleDecided() {
    try {
      await updateItem.mutateAsync({ id: item.id, is_decided: !item.is_decided })
    } catch {
      toast.error('Failed to update item')
    }
  }

  const isPlace = item.place !== null
  const place = item.place
  const category = place ? PLACE_CATEGORIES.find((c) => c.value === place.category) : null
  const city = getPrimaryCityForDate(item.day_date)
  const accentColor = city ? getCityColor(city).primary : undefined

  const placePhotos = place && Array.isArray(place.photos) ? (place.photos as string[]) : []
  const noteImages = Array.isArray(item.images) ? (item.images as string[]) : []
  const bannerColors = city ? getCityColor(city) : undefined

  // Place-backed items always get a banner (photo or city-tinted fallback) for
  // visual consistency with the backlog — on mobile this becomes a side photo,
  // on desktop a top banner. Text-notes only get a banner when they actually
  // have images; we don't force a placeholder on either viewport because notes
  // benefit more from a wider content area than from a left anchor.
  const orientation = isDesktop ? 'top' : 'side'
  const desktopBannerClass = 'h-16'
  let banner: React.ReactNode = undefined
  if (isPlace && place) {
    banner = (
      <div className="relative">
        <CardBanner
          photoUrl={placePhotos[0]}
          colors={bannerColors}
          icon={category?.icon ?? StickyNote}
          orientation={orientation}
          className={isDesktop ? desktopBannerClass : undefined}
        />
        <StarToggle place={place} className="absolute top-2 left-2" />
      </div>
    )
  } else if (noteImages.length > 0) {
    banner = (
      <CardBanner
        photoUrl={noteImages[0]}
        colors={bannerColors}
        icon={StickyNote}
        orientation={orientation}
        className={isDesktop ? desktopBannerClass : undefined}
      />
    )
  }

  // Action panel buttons. Reservation actions only apply to places (text-notes
  // can't have reservations). Lock/Speculative applies to both. Delete is
  // always last and styled destructive.
  const actions: CardAction[] = []
  if (!isPlace) {
    actions.push({ icon: Pencil, label: 'Edit', onClick: () => setTextNoteOpen(true) })
  }
  if (isPlace) {
    actions.push({
      icon: Clock,
      label: item.reservation_time ? 'Reservation' : 'Reserve',
      onClick: () => setReservationOpen(true),
    })
  }
  actions.push({
    icon: item.is_decided ? Unlock : Lock,
    label: item.is_decided ? 'Speculative' : 'Lock in',
    onClick: handleToggleDecided,
  })
  if (isPlace && place) {
    actions.push({
      icon: Archive,
      label: 'Archive',
      onClick: () => archivePlace(place),
    })
  }
  actions.push({
    icon: Trash2,
    label: 'Delete',
    onClick: handleDelete,
    variant: 'destructive',
  })

  return (
    <SortableItemCard
      id={item.id}
      data={{
        dayDate,
        kind: 'itinerary' as const,
        timeSlot: item.time_slot,
        // Surface the place id so other cards' NestDropZone can identify the
        // dragged source and the global drag handler can resolve the child for
        // a nest drop.
        placeId: place?.id,
      }}
      // When this card represents a place, expose it as a nest target so other
      // place drags can land here to make this place a parent.
      nestPlaceId={isPlace && place ? place.id : undefined}
      actions={actions}
      variant={item.is_decided ? 'decided' : 'speculative'}
      accentColor={accentColor}
      banner={banner}
      bannerOrientation={orientation}
      onCardClick={isPlace && place ? () => onSelectPlace?.(place) : undefined}
    >
      {isPlace && place ? (
        <div>
          <div className="flex items-center gap-1.5 min-w-0">
            {category && <category.icon size={14} className="shrink-0 text-muted-foreground" />}
            <span className="text-sm font-medium text-left leading-tight truncate min-w-0 flex-1">
              {place.name}
              {childCount > 0 && (
                <span className="text-muted-foreground font-normal">
                  {' · '}
                  {childCount} {childCount === 1 ? 'place' : 'places'}
                </span>
              )}
            </span>
          </div>
          {item.reservation_time && (
            <button
              className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setReservationOpen(true)
              }}
              title="Edit reservation"
            >
              <Clock className="h-3 w-3" />
              {formatReservationTime(item.reservation_time)}
            </button>
          )}
          {item.reservation_notes && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {item.reservation_notes}
            </p>
          )}
          <ReservationDialog item={item} open={reservationOpen} onOpenChange={setReservationOpen} />
        </div>
      ) : (
        <div>
          <div className="flex items-start gap-1.5 min-w-0">
            <StickyNote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-left leading-tight min-w-0 line-clamp-3">
              {item.text_note || <span className="text-muted-foreground italic">Empty note</span>}
            </p>
          </div>
          <TextNoteDialog item={item} open={textNoteOpen} onOpenChange={setTextNoteOpen} />
        </div>
      )}
    </SortableItemCard>
  )
}
