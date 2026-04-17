import { useEffect, useRef } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUploadImages } from '@/hooks/useImageUpload'
import type { StorageOwnerKind } from '@/lib/storage'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  ownerKind: StorageOwnerKind
  ownerId: string
  max?: number
  /**
   * Fires when a thumbnail is clicked. Consumers wire this to their own
   * lightbox instance; if omitted, thumbnails are not clickable.
   */
  onOpenLightbox?: (index: number) => void
  className?: string
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

/**
 * Thumbnail strip + upload trigger. Handles file picker and clipboard paste
 * (`onPaste` on the wrapper). Disabled at cap. Consumers pass `images` and an
 * `onChange` that persists to whatever row owns them.
 */
export function ImageUploader({
  images,
  onChange,
  ownerKind,
  ownerId,
  max = 5,
  onOpenLightbox,
  className,
}: ImageUploaderProps) {
  const { upload, uploading } = useUploadImages(ownerKind, ownerId)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const atCap = images.length >= max
  // Keep handleFiles stable from the effect's POV — stash latest state in a ref
  // so the document-level listener doesn't need to re-bind on every render.
  const stateRef = useRef({ images, max, upload, onChange })
  stateRef.current = { images, max, upload, onChange }

  async function handleFiles(files: File[]) {
    const { images: cur, max: cap, upload: up, onChange: change } = stateRef.current
    if (files.length === 0) return
    const remaining = cap - cur.length
    if (remaining <= 0) {
      toast.error(`Up to ${cap} images`)
      return
    }
    const toUpload = files.slice(0, remaining)
    try {
      const urls = await up(toUpload)
      change([...cur, ...urls])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  // Paste listener lives on `document` so pastes into sibling inputs (the
  // textarea next to the uploader in NoteEditor / TextNoteDialog) still reach
  // us. Non-image pastes are ignored — we only preventDefault when we actually
  // consume a file, so text paste into textareas is untouched.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const dt = e.clipboardData
      if (!dt) return
      const files: File[] = []
      for (const item of dt.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          if (f && f.type.startsWith('image/')) files.push(f)
        }
      }
      if (files.length === 0) return
      e.preventDefault()
      void handleFiles(files)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  function handleRemove(url: string) {
    onChange(images.filter((u) => u !== url))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {images.map((url, idx) => (
        <div
          key={url}
          className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
        >
          <button
            type="button"
            onClick={() => onOpenLightbox?.(idx)}
            className="h-full w-full"
            aria-label={`Open image ${idx + 1}`}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
          <button
            type="button"
            onClick={() => handleRemove(url)}
            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {!atCap && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              void handleFiles(files)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-16 w-16 flex-col gap-0.5 border-dashed text-muted-foreground"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-label="Add photo"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span className="text-[10px]">Add</span>
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
