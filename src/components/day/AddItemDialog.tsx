import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaceCard } from '@/components/places/PlaceCard'
import { useCreateItineraryItem, useUnscheduledPlaces } from '@/hooks/useItinerary'
import { useCreateTransportItem } from '@/hooks/useTransport'
import { TIME_SLOTS, type TimeSlot, deriveTimeSlot } from '@/types/itinerary'
import { TRANSPORT_TYPES, type TransportType } from '@/types/transport'
import { CITY_LABELS } from '@/config/trip'
import type { PlaceRow } from '@/types/places'

interface AddItemDialogProps {
  dayDate: string
  currentItemCount: number
}

export function AddItemDialog({ dayDate, currentItemCount }: AddItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'place' | 'note' | 'transport'>('place')
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning')
  const [noteText, setNoteText] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)
  const [reservationTime, setReservationTime] = useState('')
  const [reservationNotes, setReservationNotes] = useState('')

  // Transport state
  const [transportType, setTransportType] = useState<TransportType>('shinkansen')
  const [transportOrigin, setTransportOrigin] = useState(() => Object.values(CITY_LABELS)[0])
  const [transportDestination, setTransportDestination] = useState(
    () => Object.values(CITY_LABELS)[0]
  )
  const [transportDepartureTime, setTransportDepartureTime] = useState('')
  const [transportArrivalTime, setTransportArrivalTime] = useState('')
  const [transportConfirmation, setTransportConfirmation] = useState('')
  const [transportNotes, setTransportNotes] = useState('')

  const { data: unscheduled = [] } = useUnscheduledPlaces()
  const createItem = useCreateItineraryItem()
  const createTransport = useCreateTransportItem()

  const effectiveTimeSlot =
    tab === 'transport' && transportDepartureTime
      ? deriveTimeSlot(transportDepartureTime)
      : reservationTime
        ? deriveTimeSlot(reservationTime)
        : timeSlot

  const timeSlotLocked = (tab === 'transport' && !!transportDepartureTime) || !!reservationTime

  async function handleAddPlace() {
    if (!selectedPlace) return
    try {
      await createItem.mutateAsync({
        day_date: dayDate,
        place_id: selectedPlace.id,
        time_slot: effectiveTimeSlot,
        sort_order: currentItemCount,
        ...(reservationTime && {
          reservation_time: reservationTime,
          reservation_notes: reservationNotes.trim() || null,
        }),
      })
      toast.success(`${selectedPlace.name} added to ${effectiveTimeSlot}`)
      setSelectedPlace(null)
      setReservationTime('')
      setReservationNotes('')
      setOpen(false)
    } catch {
      toast.error('Failed to add place')
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
      })
      toast.success('Note added')
      setNoteText('')
      setOpen(false)
    } catch {
      toast.error('Failed to add note')
    }
  }

  async function handleAddTransport() {
    if (!transportOrigin.trim() || !transportDestination.trim() || !transportDepartureTime) return
    try {
      await createTransport.mutateAsync({
        day_date: dayDate,
        type: transportType,
        origin: transportOrigin.trim(),
        destination: transportDestination.trim(),
        departure_time: transportDepartureTime,
        arrival_time: transportArrivalTime || null,
        confirmation: transportConfirmation.trim() || null,
        notes: transportNotes.trim() || null,
        time_slot: deriveTimeSlot(transportDepartureTime),
        sort_order: currentItemCount,
      })
      const label = TRANSPORT_TYPES.find((t) => t.value === transportType)?.label ?? 'Transport'
      toast.success(`${label} added`)
      setTransportType('shinkansen')
      setTransportOrigin(Object.values(CITY_LABELS)[0])
      setTransportDestination(Object.values(CITY_LABELS)[0])
      setTransportDepartureTime('')
      setTransportArrivalTime('')
      setTransportConfirmation('')
      setTransportNotes('')
      setOpen(false)
    } catch {
      toast.error('Failed to add transport')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5 w-full" />}>
        <Plus className="h-4 w-4" />
        Add to itinerary
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to itinerary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time slot */}
          <div className="space-y-1.5">
            <Label>Time of day</Label>
            <Select
              value={effectiveTimeSlot}
              onValueChange={(v) => setTimeSlot(v as TimeSlot)}
              disabled={timeSlotLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'place' | 'note' | 'transport')}>
            <TabsList className="w-full">
              <TabsTrigger value="place" className="flex-1">
                Place
              </TabsTrigger>
              <TabsTrigger value="note" className="flex-1">
                Note
              </TabsTrigger>
              <TabsTrigger value="transport" className="flex-1">
                Transport
              </TabsTrigger>
            </TabsList>

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
                <Label htmlFor="add-transport-type">Type</Label>
                <select
                  id="add-transport-type"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value as TransportType)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {TRANSPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-transport-origin">From</Label>
                  <select
                    id="add-transport-origin"
                    value={transportOrigin}
                    onChange={(e) => setTransportOrigin(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.entries(CITY_LABELS).map(([, label]) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-transport-destination">To</Label>
                  <select
                    id="add-transport-destination"
                    value={transportDestination}
                    onChange={(e) => setTransportDestination(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.entries(CITY_LABELS).map(([, label]) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-transport-departure">Departs</Label>
                  <input
                    id="add-transport-departure"
                    type="time"
                    value={transportDepartureTime}
                    onChange={(e) => setTransportDepartureTime(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-transport-arrival">Arrives (optional)</Label>
                  <input
                    id="add-transport-arrival"
                    type="time"
                    value={transportArrivalTime}
                    onChange={(e) => setTransportArrivalTime(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-transport-confirmation">Confirmation # (optional)</Label>
                <input
                  id="add-transport-confirmation"
                  type="text"
                  value={transportConfirmation}
                  onChange={(e) => setTransportConfirmation(e.target.value)}
                  placeholder="e.g. ABC-12345"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-transport-notes">Notes (optional)</Label>
                <Textarea
                  id="add-transport-notes"
                  value={transportNotes}
                  onChange={(e) => setTransportNotes(e.target.value)}
                  placeholder="e.g. Reserved seats car 7, row 14"
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                disabled={!transportDepartureTime || createTransport.isPending}
                onClick={handleAddTransport}
              >
                {createTransport.isPending ? 'Adding…' : 'Add transport'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
