import { useCallback, useState } from 'react'

interface LightboxState {
  images: string[]
  startIndex: number
  open: boolean
}

/**
 * Tiny state wrapper around a multi-image lightbox. Consumers call `openAt(i)`
 * with the array they want to browse; `close()` resets. Keeps one instance per
 * surface so PlaceDetail, NoteEditor, and TextNoteDialog can each own their own
 * without fighting over global state.
 */
export function useLightbox() {
  const [state, setState] = useState<LightboxState>({ images: [], startIndex: 0, open: false })

  const openAt = useCallback((images: readonly string[], startIndex: number) => {
    setState({ images: [...images], startIndex, open: true })
  }, [])

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }))
  }, [])

  return {
    open: state.open,
    images: state.images,
    startIndex: state.startIndex,
    openAt,
    close,
  }
}
