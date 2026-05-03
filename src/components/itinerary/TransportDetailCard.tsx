import { useEffect } from 'react'
import { X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Journey } from '@/types/transport'
import { deriveJourneyDisplay } from '@/lib/transport-utils'
import { TransportDetailContent } from './TransportDetailContent'

interface TransportDetailCardProps {
  journey: Journey
  onClose: () => void
  onEdit: () => void
  variant?: 'floating' | 'sheet'
}

export function TransportDetailCard({
  journey,
  onClose,
  onEdit,
  variant = 'floating',
}: TransportDetailCardProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const display = deriveJourneyDisplay(journey)
  const isFloating = variant === 'floating'

  return (
    <div
      className={
        isFloating
          ? 'absolute top-2 right-2 z-20 w-[320px] max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg border bg-background shadow-xl'
          : 'flex h-full w-full flex-col overflow-y-auto bg-background'
      }
      role="dialog"
      aria-label={`${display.title} details`}
    >
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-1.5 right-1.5 z-20 h-6 w-6 rounded-full hover:bg-muted"
        onClick={onClose}
        aria-label="Close details"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <TransportDetailContent journey={journey} />

      <div className="px-3 pb-3 flex justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  )
}
