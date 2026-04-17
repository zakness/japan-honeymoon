import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface LightboxProps {
  open: boolean
  images: string[]
  startIndex?: number
  onClose: () => void
}

/**
 * Full-screen image viewer. Esc + click-outside close; arrow keys navigate
 * within the array. Restores focus to the trigger element on close.
 */
export function Lightbox({ open, images, startIndex = 0, onClose }: LightboxProps) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement as HTMLElement | null
    setIndex(Math.min(Math.max(startIndex, 0), Math.max(images.length - 1, 0)))
  }, [open, startIndex, images.length])

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus?.()
      return
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => (i + 1) % images.length)
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => (i - 1 + images.length) % images.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, images.length, onClose])

  if (!open || images.length === 0) return null

  const i = Math.min(Math.max(index, 0), images.length - 1)
  const canNav = images.length > 1

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white/90 hover:bg-black/60 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {canNav && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIndex((n) => (n - 1 + images.length) % images.length)
          }}
          className="absolute left-4 rounded-full bg-black/40 p-2 text-white/90 hover:bg-black/60 hover:text-white"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <img
        src={images[i]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {canNav && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIndex((n) => (n + 1) % images.length)
          }}
          className="absolute right-4 rounded-full bg-black/40 p-2 text-white/90 hover:bg-black/60 hover:text-white"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      {canNav && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/90">
          {i + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
