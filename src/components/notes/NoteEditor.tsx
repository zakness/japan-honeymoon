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
import { useUpdateNote, useDeleteNote } from '@/hooks/useNotes'
import type { NoteRow } from '@/types/notes'

interface NoteEditorProps {
  note: NoteRow
  onDelete: () => void
}

export function NoteEditor({ note, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body ?? '')
  const [saved, setSaved] = useState(true)

  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when a different note is selected
  useEffect(() => {
    setTitle(note.title)
    setBody(note.body ?? '')
    setSaved(true)
  }, [note.id, note.title, note.body])

  function scheduleSave(newTitle: string, newBody: string) {
    setSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(newTitle, newBody), 800)
  }

  async function save(t: string, b: string) {
    if (!t.trim()) return
    try {
      await updateNote.mutateAsync({ id: note.id, title: t.trim(), body: b || null })
      setSaved(true)
    } catch {
      toast.error('Failed to save note')
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    scheduleSave(e.target.value, body)
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value)
    scheduleSave(title, e.target.value)
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
            <><Check className="h-3 w-3 text-green-500" /> Saved</>
          ) : (
            'Saving…'
          )}
        </span>
        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5" type="button">
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
    </div>
  )
}
