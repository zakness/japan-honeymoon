import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUpdateItineraryItem } from '@/hooks/useItinerary'
import {
  deriveTimeSlot,
  formatReservationTime,
  type ItineraryItemWithPlace,
} from '@/types/itinerary'

interface ReservationDialogProps {
  item: ItineraryItemWithPlace
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReservationDialog({ item, open, onOpenChange }: ReservationDialogProps) {
  const existingTime = item.reservation_time
    ? item.reservation_time.slice(0, 5) // "HH:MM:SS" → "HH:MM" for <input type="time">
    : ''
  const [time, setTime] = useState(existingTime)
  const [notes, setNotes] = useState(item.reservation_notes ?? '')

  const updateItem = useUpdateItineraryItem()

  // Reset local state when dialog opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setTime(item.reservation_time ? item.reservation_time.slice(0, 5) : '')
      setNotes(item.reservation_notes ?? '')
    }
    onOpenChange(nextOpen)
  }

  async function handleSave() {
    if (!time) return
    try {
      await updateItem.mutateAsync({
        id: item.id,
        reservation_time: time,
        reservation_notes: notes.trim() || null,
        time_slot: deriveTimeSlot(time),
      })
      const label = item.place?.name ?? 'Item'
      toast.success(`Reservation set for ${label} at ${formatReservationTime(time)}`)
      onOpenChange(false)
    } catch {
      toast.error('Failed to save reservation')
    }
  }

  async function handleClear() {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        reservation_time: null,
        reservation_notes: null,
      })
      toast.success('Reservation cleared')
      onOpenChange(false)
    } catch {
      toast.error('Failed to clear reservation')
    }
  }

  const isEditing = !!item.reservation_time

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit reservation' : 'Set reservation time'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reservation-time">Time</Label>
            <input
              id="reservation-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reservation-notes">Notes (optional)</Label>
            <Textarea
              id="reservation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ask for window seat, bring printed tickets…"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!time || updateItem.isPending}
              onClick={handleSave}
            >
              {updateItem.isPending ? 'Saving…' : 'Save'}
            </Button>
            {isEditing && (
              <Button variant="outline" disabled={updateItem.isPending} onClick={handleClear}>
                Clear
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
