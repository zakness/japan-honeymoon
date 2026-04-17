import { useState, useEffect, useRef } from 'react'
import { Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Lightbox } from '@/components/shared/Lightbox'
import { useLightbox } from '@/hooks/useLightbox'
import { deleteStorageObjects } from '@/lib/storage'
import { useUpdateNote, useDeleteNote } from '@/hooks/useNotes'
import type { NoteRow } from '@/types/notes'

interface NoteEditorProps {
  note: NoteRow
  onDelete: () => void
}

function toImageArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

export function NoteEditor({ note, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body ?? '')
  const [images, setImages] = useState<string[]>(toImageArray(note.images))
  const [saved, setSaved] = useState(true)

  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lightbox = useLightbox()

  // Reset state when a different note is selected. Also resets image state so
  // an upload on one note doesn't leak into another.
  useEffect(() => {
    setTitle(note.title)
    setBody(note.body ?? '')
    setImages(toImageArray(note.images))
    setSaved(true)
  }, [note.id, note.title, note.body, note.images])

  function scheduleSave(next: { title?: string; body?: string; images?: string[] }) {
    setSaved(false)
    const payload = {
      title: next.title ?? title,
      body: next.body ?? body,
      images: next.images ?? images,
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(payload), 800)
  }

  async function save(p: { title: string; body: string; images: string[] }) {
    if (!p.title.trim()) return
    try {
      await updateNote.mutateAsync({
        id: note.id,
        title: p.title.trim(),
        body: p.body || null,
        images: p.images.length > 0 ? p.images : null,
      })
      setSaved(true)
    } catch {
      toast.error('Failed to save note')
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    scheduleSave({ title: e.target.value })
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value)
    scheduleSave({ body: e.target.value })
  }

  function handleImagesChange(next: string[]) {
    // Identify removed URLs and clean them from Storage so we don't orphan.
    const removed = images.filter((u) => !next.includes(u))
    setImages(next)
    scheduleSave({ images: next })
    if (removed.length > 0) void deleteStorageObjects(removed)
  }

  async function handleDelete() {
    try {
      await deleteNote.mutateAsync(note.id)
      onDelete()
    } catch {
      toast.error('Failed to delete note')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          {saved ? (
            <>
              <Check className="h-3 w-3 text-green-500" /> Saved
            </>
          ) : (
            'Saving…'
          )}
        </span>
        <AlertDialog>
          <AlertDialogTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive gap-1.5"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>
                "{note.title}" will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Editor */}
      <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
        <ImageUploader
          images={images}
          onChange={handleImagesChange}
          ownerKind="notes"
          ownerId={note.id}
          onOpenLightbox={(idx) => lightbox.openAt(images, idx)}
        />
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title"
          className="text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
        />
        <Textarea
          value={body}
          onChange={handleBodyChange}
          placeholder="Start writing…"
          className="flex-1 resize-none border-none shadow-none px-0 focus-visible:ring-0 text-sm leading-relaxed"
        />
      </div>
      <Lightbox
        open={lightbox.open}
        images={lightbox.images}
        startIndex={lightbox.startIndex}
        onClose={lightbox.close}
      />
    </div>
  )
}
