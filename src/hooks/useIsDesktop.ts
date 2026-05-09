import { useEffect, useState } from 'react'

/**
 * Tracks whether the viewport matches the `sm` breakpoint (≥640px). Used to
 * render the desktop layout OR the mobile layout — never both. Rendering both
 * branches duplicates every `useDraggable`/`useSortable` hook in the tree,
 * which causes the second registration to overwrite the first in dnd-kit's
 * `draggableNodes` Map. When the "winning" instance lives in the hidden
 * (`display: none`) branch, dnd-kit measures a 0×0 rect for the active node
 * and the DragOverlay is positioned at (0, 0).
 *
 * Also used to gate DnD sensors so touch-based scrolling on mobile isn't
 * stolen by drag activation.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 640px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    // Re-read once on attach in case the value flipped between the initial
    // useState read and effect-attach (e.g. orientation change during mount).
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}
