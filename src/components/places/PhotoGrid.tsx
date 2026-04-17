import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoGridProps {
  photos: string[]
  /** The url currently treated as primary (typically `photos[0]`). */
  primaryUrl: string | undefined
  onSelectPrimary: (url: string) => void
}

/**
 * 3-column thumbnail grid for Google-sourced place photos. Click a thumb to
 * mark it primary; the primary gets a filled-star overlay and a ring. Purely
 * presentational — no upload/delete affordances (Google photos are read-only
 * in this app).
 */
export function PhotoGrid({ photos, primaryUrl, onSelectPrimary }: PhotoGridProps) {
  if (photos.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((url, i) => {
        const isPrimary = url === primaryUrl
        return (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => onSelectPrimary(url)}
            className={cn(
              'relative aspect-square overflow-hidden rounded-md border transition-all',
              isPrimary
                ? 'ring-2 ring-primary ring-offset-1 border-primary'
                : 'border-transparent hover:border-border'
            )}
            aria-label={isPrimary ? 'Primary photo' : 'Set as primary photo'}
            aria-pressed={isPrimary}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            {isPrimary && (
              <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <Star className="h-3 w-3 fill-current" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
