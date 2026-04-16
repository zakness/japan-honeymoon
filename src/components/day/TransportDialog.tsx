import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUpdateTransportItem } from '@/hooks/useTransport'
import { deriveTimeSlot, formatReservationTime } from '@/types/itinerary'
import { TRANSPORT_TYPES, type TransportItemRow, type TransportType } from '@/types/transport'
import { CITY_LABELS } from '@/config/trip'

interface TransportDialogProps {
  item: TransportItemRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransportDialog({ item, open, onOpenChange }: TransportDialogProps) {
  const [type, setType] = useState<TransportType>(item.type as TransportType)
  const [origin, setOrigin] = useState(item.origin)
  const [destination, setDestination] = useState(item.destination)
  const [departureTime, setDepartureTime] = useState(item.departure_time.slice(0, 5))
  const [arrivalTime, setArrivalTime] = useState(item.arrival_time?.slice(0, 5) ?? '')
  const [confirmation, setConfirmation] = useState(item.confirmation ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  const updateItem = useUpdateTransportItem()

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setType(item.type as TransportType)
      setOrigin(item.origin)
      setDestination(item.destination)
      setDepartureTime(item.departure_time.slice(0, 5))
      setArrivalTime(item.arrival_time?.slice(0, 5) ?? '')
      setConfirmation(item.confirmation ?? '')
      setNotes(item.notes ?? '')
    }
    onOpenChange(nextOpen)
  }

  async function handleSave() {
    if (!origin || !destination || !departureTime) return
    try {
      await updateItem.mutateAsync({
        id: item.id,
        type,
        origin: origin.trim(),
        destination: destination.trim(),
        departure_time: departureTime,
        arrival_time: arrivalTime || null,
        confirmation: confirmation.trim() || null,
        notes: notes.trim() || null,
        time_slot: deriveTimeSlot(departureTime),
      })
      toast.success(
        `${TRANSPORT_TYPES.find((t) => t.value === type)?.label} updated — departs ${formatReservationTime(departureTime)}`
      )
      onOpenChange(false)
    } catch {
      toast.error('Failed to save transport')
    }
  }

  const isValid = origin && destination && departureTime

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit transport</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="transport-type">Type</Label>
            <select
              id="transport-type"
              value={type}
              onChange={(e) => setType(e.target.value as TransportType)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TRANSPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="transport-origin">From</Label>
              <select
                id="transport-origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
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
              <Label htmlFor="transport-destination">To</Label>
              <select
                id="transport-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
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
              <Label htmlFor="transport-departure">Departs</Label>
              <input
                id="transport-departure"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transport-arrival">Arrives (optional)</Label>
              <input
                id="transport-arrival"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transport-confirmation">Confirmation # (optional)</Label>
            <input
              id="transport-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="e.g. ABC-12345"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transport-notes">Notes (optional)</Label>
            <Textarea
              id="transport-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reserved seats car 7, row 14"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!isValid || updateItem.isPending}
              onClick={handleSave}
            >
              {updateItem.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
