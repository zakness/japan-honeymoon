import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Lightbox } from '@/components/shared/Lightbox'
import { useLightbox } from '@/hooks/useLightbox'
import { useUpdateItineraryItem } from '@/hooks/useItinerary'
import { deleteStorageObjects } from '@/lib/storage'
import type { ItineraryItemWithPlace } from '@/types/itinerary'

interface TextNoteDialogProps {
  item: ItineraryItemWithPlace
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toImageArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

export function TextNoteDialog({ item, open, onOpenChange }: TextNoteDialogProps) {
  const [text, setText] = useState(item.text_note ?? '')
  const [images, setImages] = useState<string[]>(toImageArray(item.images))
  const updateItem = useUpdateItineraryItem()
  const lightbox = useLightbox()

  // Reset form state on every closed→open transition, like AddItemDialog.
  useEffect(() => {
    if (open) {
      setText(item.text_note ?? '')
      setImages(toImageArray(item.images))
    }
  }, [open, item.text_note, item.images])

  function handleImagesChange(next: string[]) {
    const removed = images.filter((u) => !next.includes(u))
    setImages(next)
    // Fire-and-forget Storage cleanup for images the user removed in-dialog.
    // Only runs when they drop an image; saving just persists the remaining
    // URLs to the row.
    if (removed.length > 0) void deleteStorageObjects(removed)
  }

  async function handleSave() {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        text_note: text.trim() || null,
        images: images.length > 0 ? images : null,
      })
      onOpenChange(false)
    } catch {
      toast.error('Failed to save note')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <ImageUploader
              images={images}
              onChange={handleImagesChange}
              ownerKind="note-items"
              ownerId={item.id}
              onOpenLightbox={(idx) => lightbox.openAt(images, idx)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="text-note">Note</Label>
            <Textarea
              id="text-note"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a note…"
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" disabled={updateItem.isPending} onClick={handleSave}>
              {updateItem.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>

        <Lightbox
          open={lightbox.open}
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={lightbox.close}
        />
      </DialogContent>
    </Dialog>
  )
}
