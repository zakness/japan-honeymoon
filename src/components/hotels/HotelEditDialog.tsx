import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HotelForm } from './HotelForm'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelEditDialogProps {
  /** When non-null, the dialog is open editing this hotel. */
  hotel: AccommodationRow | null
  onOpenChange: (open: boolean) => void
  /**
   * Called with the saved row after a successful edit. AppShell uses this to
   * refresh the lifted `selectedHotel` so the detail card shows new data.
   */
  onSuccess?: (updated: AccommodationRow) => void
}

export function HotelEditDialog({ hotel, onOpenChange, onSuccess }: HotelEditDialogProps) {
  return (
    <Dialog open={!!hotel} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit hotel</DialogTitle>
        </DialogHeader>
        {hotel && (
          <HotelForm
            hotel={hotel}
            onSuccess={(updated) => {
              onSuccess?.(updated)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
