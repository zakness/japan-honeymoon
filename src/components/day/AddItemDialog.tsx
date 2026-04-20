import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TIME_SLOT_ICONS } from '@/lib/time-slot-icons'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PlaceCard } from '@/components/places/PlaceCard'
import { useCreateItineraryItem, useUnscheduledPlaces } from '@/hooks/useItinerary'
import { useCreateJourney, type LegDraft } from '@/hooks/useTransport'
import { TIME_SLOTS, type TimeSlot, deriveTimeSlot } from '@/types/itinerary'
import { getCityColor, getDayByDate } from '@/config/trip'
import type { PlaceRow } from '@/types/places'
import { TransportLegEditor, legsAreValid } from './TransportLegEditor'

interface AddItemDialogProps {
  dayDate: string
  currentItemCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected time slot when the dialog opens. */
  initialSlot: TimeSlot
}

export function AddItemDialog({
  dayDate,
  currentItemCount,
  open,
  onOpenChange,
  initialSlot,
}: AddItemDialogProps) {
  const [tab, setTab] = useState<'place' | 'note' | 'transport'>('place')
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(initialSlot)
  const [noteText, setNoteText] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)
  const [reservationTime, setReservationTime] = useState('')
  const [reservationNotes, setReservationNotes] = useState('')
  const [isDecided, setIsDecided] = useState(false)
  const [transportLegs, setTransportLegs] = useState<LegDraft[]>([])
  const [transportTitle, setTransportTitle] = useState('')
  const [transportNotes, setTransportNotes] = useState('')

  // Reset all form state and sync the time-slot dropdown to `initialSlot`
  // whenever the dialog transitions from closed → open. This gives every open
  // a fresh form and prevents stale state from leaking between slot entry
  // points after the state was lifted up to DayColumn.
  useEffect(() => {
    if (!open) return
    setTab('place')
    setTimeSlot(initialSlot)
    setNoteText('')
    setSelectedPlace(null)
    setReservationTime('')
    setReservationNotes('')
    setIsDecided(false)
    setTransportLegs([
      {
        mode: 'shinkansen',
        origin_name: '',
        origin_place_id: null,
        origin_lat: null,
        origin_lng: null,
        destination_name: '',
        destination_place_id: null,
        destination_lat: null,
        destination_lng: null,
        departure_time: '',
        arrival_time: null,
        is_booked: false,
        confirmation: null,
        notes: null,
      },
    ])
    setTransportTitle('')
    setTransportNotes('')
  }, [open, initialSlot])

  const { data: unscheduled = [] } = useUnscheduledPlaces()
  const createItem = useCreateItineraryItem()
  const createJourney = useCreateJourney()

  // Earliest leg departure drives the transport tab's time slot.
  const earliestLegDeparture = transportLegs
    .map((l) => l.departure_time)
    .filter(Boolean)
    .sort()[0]

  const effectiveTimeSlot = (() => {
    if (tab === 'transport' && earliestLegDeparture) return deriveTimeSlot(earliestLegDeparture)
    if (reservationTime) return deriveTimeSlot(reservationTime)
    return timeSlot
  })()

  const timeSlotLocked = !!reservationTime || (tab === 'transport' && !!earliestLegDeparture)

  async function handleAddPlace() {
    if (!selectedPlace) return
    try {
      await createItem.mutateAsync({
        day_date: dayDate,
        place_id: selectedPlace.id,
        time_slot: effectiveTimeSlot,
        sort_order: currentItemCount,
        // A reservation implies decided; the hook also enforces this.
        is_decided: isDecided || !!reservationTime,
        ...(reservationTime && {
          reservation_time: reservationTime,
          reservation_notes: reservationNotes.trim() || null,
        }),
      })
      toast.success(`${selectedPlace.name} added to ${effectiveTimeSlot}`)
      onOpenChange(false)
    } catch {
      toast.error('Failed to add place')
    }
  }

  async function handleAddTransport() {
    if (!legsAreValid(transportLegs)) {
      toast.error('Each leg needs origin, destination, and departure time')
      return
    }
    try {
      await createJourney.mutateAsync({
        parent: {
          day_date: dayDate,
          time_slot: effectiveTimeSlot,
          sort_order: currentItemCount,
          title: transportTitle.trim() || null,
          notes: transportNotes.trim() || null,
        },
        legs: transportLegs,
      })
      toast.success('Transport added')
      onOpenChange(false)
    } catch {
      toast.error('Failed to add transport')
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    try {
      await createItem.mutateAsync({
        day_date: dayDate,
        text_note: noteText.trim(),
        time_slot: timeSlot,
        sort_order: currentItemCount,
        is_decided: isDecided,
      })
      toast.success('Note added')
      onOpenChange(false)
    } catch {
      toast.error('Failed to add note')
    }
  }

  // Header background: solid city tint for single-city days, hard left/right
  // split (origin → destination) for transit days — mirrors DayColumn.
  const day = getDayByDate(dayDate)
  const headerBg = (() => {
    if (!day || day.cities.length === 0) return undefined
    if (day.cities.length === 1) return getCityColor(day.cities[0]).tint
    const origin = getCityColor(day.cities[0]).tint
    const destination = getCityColor(day.cities[day.cities.length - 1]).tint
    return `linear-gradient(to right, ${origin} 0%, ${origin} 50%, ${destination} 50%, ${destination} 100%)`
  })()

  const headerDate = new Date(dayDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const headerLabel = day?.label ?? 'Add to itinerary'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader
          className="-mx-4 -mt-4 gap-0.5 rounded-t-xl border-b px-4 py-3"
          style={headerBg ? { background: headerBg } : undefined}
        >
          <DialogTitle>Add to itinerary</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {headerLabel} · {headerDate}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'place' | 'note' | 'transport')}>
            <div className="flex items-center gap-2">
              <TabsList className="flex-1">
                <TabsTrigger value="place" className="flex-1">
                  Place
                </TabsTrigger>
                <TabsTrigger value="transport" className="flex-1">
                  Transport
                </TabsTrigger>
                <TabsTrigger value="note" className="flex-1">
                  Note
                </TabsTrigger>
              </TabsList>
              <div
                role="radiogroup"
                aria-label="Time of day"
                className="inline-flex h-8 shrink-0 items-center rounded-lg bg-muted p-[3px] text-muted-foreground"
              >
                {TIME_SLOTS.map(({ value, label }) => {
                  const Icon = TIME_SLOT_ICONS[value]
                  const active = effectiveTimeSlot === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={label}
                      title={timeSlotLocked ? `${label} (locked by reservation time)` : label}
                      disabled={timeSlotLocked}
                      onClick={() => setTimeSlot(value)}
                      className={cn(
                        'inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-2 text-foreground/60 transition-all hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
                        active && 'bg-background text-foreground shadow-sm'
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            <TabsContent value="place" className="space-y-3 mt-3">
              {unscheduled.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All saved places are already scheduled. Add more places from the Map view.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {unscheduled.length} unscheduled place{unscheduled.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {unscheduled.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        compact
                        selected={selectedPlace?.id === place.id}
                        onClick={() =>
                          setSelectedPlace(selectedPlace?.id === place.id ? null : place)
                        }
                      />
                    ))}
                  </div>
                  <div className="space-y-2 pt-1 border-t">
                    <div className="space-y-1.5">
                      <Label htmlFor="add-reservation-time">Reservation time (optional)</Label>
                      <input
                        id="add-reservation-time"
                        type="time"
                        value={reservationTime}
                        onChange={(e) => setReservationTime(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    {reservationTime && (
                      <div className="space-y-1.5">
                        <Label htmlFor="add-reservation-notes">Notes (optional)</Label>
                        <Textarea
                          id="add-reservation-notes"
                          value={reservationNotes}
                          onChange={(e) => setReservationNotes(e.target.value)}
                          placeholder="e.g. Ask for window seat…"
                          rows={2}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-foreground disabled:opacity-50"
                        checked={isDecided || !!reservationTime}
                        disabled={!!reservationTime}
                        onChange={(e) => setIsDecided(e.target.checked)}
                      />
                      <span>
                        Lock in as decided
                        {reservationTime && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (reservation implies decided)
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!selectedPlace || createItem.isPending}
                    onClick={handleAddPlace}
                  >
                    {createItem.isPending
                      ? 'Adding…'
                      : selectedPlace
                        ? `Add ${selectedPlace.name}`
                        : 'Select a place above'}
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="note" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label>Note text</Label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Check into hotel, free time, walk through Gion…"
                  rows={3}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-foreground"
                  checked={isDecided}
                  onChange={(e) => setIsDecided(e.target.checked)}
                />
                <span>Lock in as decided</span>
              </label>
              <Button
                className="w-full"
                disabled={!noteText.trim() || createItem.isPending}
                onClick={handleAddNote}
              >
                {createItem.isPending ? 'Adding…' : 'Add note'}
              </Button>
            </TabsContent>

            <TabsContent value="transport" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="transport-title">Title (optional)</Label>
                <input
                  id="transport-title"
                  type="text"
                  value={transportTitle}
                  onChange={(e) => setTransportTitle(e.target.value)}
                  placeholder="e.g. Kyoto → Naoshima"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <TransportLegEditor legs={transportLegs} onChange={setTransportLegs} />

              <div className="space-y-1.5">
                <Label htmlFor="transport-journey-notes">Journey notes (optional)</Label>
                <Textarea
                  id="transport-journey-notes"
                  value={transportNotes}
                  onChange={(e) => setTransportNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Seat reservations done on JR site…"
                />
              </div>

              <Button
                className="w-full"
                disabled={!legsAreValid(transportLegs) || createJourney.isPending}
                onClick={handleAddTransport}
              >
                {createJourney.isPending ? 'Adding…' : 'Add transport'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
