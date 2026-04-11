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
import { TIME_SLOTS, type TimeSlot } from '@/types/itinerary'
import type { PlaceRow } from '@/types/places'

interface AddItemDialogProps {
  dayDate: string
  currentItemCount: number
}

export function AddItemDialog({ dayDate, currentItemCount }: AddItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'place' | 'note'>('place')
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning')
  const [noteText, setNoteText] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | null>(null)

  const { data: unscheduled = [] } = useUnscheduledPlaces()
  const createItem = useCreateItineraryItem()

  async function handleAddPlace() {
    if (!selectedPlace) return
    try {
      await createItem.mutateAsync({
        day_date: dayDate,
        place_id: selectedPlace.id,
        time_slot: timeSlot,
        sort_order: currentItemCount,
      })
      toast.success(`${selectedPlace.name} added to ${timeSlot}`)
      setSelectedPlace(null)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm" variant="outline" className="gap-1.5 w-full" type="button">
          <Plus className="h-4 w-4" />
          Add to itinerary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to itinerary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time slot */}
          <div className="space-y-1.5">
            <Label>Time of day</Label>
            <Select value={timeSlot} onValueChange={(v) => setTimeSlot(v as TimeSlot)}>
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

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'place' | 'note')}>
            <TabsList className="w-full">
              <TabsTrigger value="place" className="flex-1">
                Add place
              </TabsTrigger>
              <TabsTrigger value="note" className="flex-1">
                Add note
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
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
