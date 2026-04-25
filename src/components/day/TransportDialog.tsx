import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateTimeInput } from '@/components/ui/datetime-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TransportLegEditor, legsAreValid } from './TransportLegEditor'
import { useUpdateJourney, type LegDraft } from '@/hooks/useTransport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { deriveTimeSlot } from '@/types/itinerary'
import type { Journey, TransportItemUpdate } from '@/types/transport'
import { getDayByDate, getCityColor } from '@/config/trip'

interface TransportDialogProps {
  journey: Journey
  open: boolean
  onOpenChange: (open: boolean) => void
}

function legsFromJourney(journey: Journey): LegDraft[] {
  return journey.legs.map((l) => ({
    id: l.id,
    mode: l.mode,
    origin_name: l.origin_name,
    origin_place_id: l.origin_place_id,
    origin_lat: l.origin_lat,
    origin_lng: l.origin_lng,
    destination_name: l.destination_name,
    destination_place_id: l.destination_place_id,
    destination_lat: l.destination_lat,
    destination_lng: l.destination_lng,
    departure_time: l.departure_time,
    arrival_time: l.arrival_time,
    is_booked: l.is_booked,
    confirmation: l.confirmation,
    notes: l.notes,
  }))
}

export function TransportDialog({ journey, open, onOpenChange }: TransportDialogProps) {
  const updateJourney = useUpdateJourney()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dayDate, setDayDate] = useState('')
  const [legs, setLegs] = useState<LegDraft[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(journey.parent.title ?? '')
    setNotes(journey.parent.notes ?? '')
    setDayDate(journey.parent.day_date)
    setLegs(legsFromJourney(journey))
  }, [open, journey])

  async function handleSave() {
    if (!legsAreValid(legs)) {
      toast.error('Each leg needs origin, destination, and departure time')
      return
    }

    const originalIds = new Set(journey.legs.map((l) => l.id))
    const keptIds = new Set(legs.map((l) => l.id).filter(Boolean) as string[])
    const legIdsToDelete = [...originalIds].filter((id) => !keptIds.has(id))

    // Derive time_slot from the earliest departure so the card lands in the right slot.
    const earliestDeparture = legs
      .map((l) => l.departure_time)
      .filter(Boolean)
      .sort()[0]
    const derivedSlot = earliestDeparture ? deriveTimeSlot(earliestDeparture) : null

    const parentPatch: TransportItemUpdate = {
      title: title.trim() || null,
      notes: notes.trim() || null,
      day_date: dayDate,
      ...(derivedSlot && { time_slot: derivedSlot }),
    }

    try {
      await updateJourney.mutateAsync({
        id: journey.parent.id,
        parentPatch,
        legs,
        legIdsToDelete,
      })
      toast.success('Transport updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to save transport')
    }
  }

  const display = deriveJourneyDisplay(journey)
  const day = getDayByDate(dayDate)
  const headerBg = (() => {
    if (!day || day.cities.length === 0) return undefined
    if (day.cities.length === 1) return getCityColor(day.cities[0]).tint
    const origin = getCityColor(day.cities[0]).tint
    const destination = getCityColor(day.cities[day.cities.length - 1]).tint
    return `linear-gradient(to right, ${origin} 0%, ${origin} 50%, ${destination} 50%, ${destination} 100%)`
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader
          className="-mx-4 -mt-4 gap-0.5 rounded-t-xl border-b px-4 py-3"
          style={headerBg ? { background: headerBg } : undefined}
        >
          <DialogTitle>Edit transport</DialogTitle>
          <p className="text-xs text-muted-foreground">{display.title}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="transport-day">
                Day
              </Label>
              <DateTimeInput
                id="transport-day"
                type="date"
                value={dayDate}
                onValueChange={setDayDate}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="transport-title">
                Title (optional)
              </Label>
              <Input
                id="transport-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={display.title}
              />
            </div>
          </div>

          <TransportLegEditor legs={legs} onChange={setLegs} />

          <div className="space-y-1">
            <Label className="text-xs" htmlFor="transport-notes">
              Journey notes (optional)
            </Label>
            <Textarea
              id="transport-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Bring bento for the long shinkansen leg…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!legsAreValid(legs) || updateJourney.isPending}>
              {updateJourney.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
