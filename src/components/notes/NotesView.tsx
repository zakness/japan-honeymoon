import { useState } from 'react'
import { Plus, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NotesList } from './NotesList'
import { NoteEditor } from './NoteEditor'
import { useNotes, useCreateNote } from '@/hooks/useNotes'
import type { NoteRow } from '@/types/notes'

export function NotesView() {
  const { data: notes = [], isLoading } = useNotes()
  const createNote = useCreateNote()
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null)

  async function handleCreate() {
    try {
      const note = await createNote.mutateAsync({
        title: 'New note',
        body: null,
        sort_order: notes.length,
      })
      setSelectedNote(note)
    } catch {
      toast.error('Failed to create note')
    }
  }

  function handleDelete() {
    setSelectedNote(null)
  }

  // On mobile: show list or editor. On desktop: side-by-side.
  return (
    <div className="flex h-full">
      {/* Sidebar: note list */}
      <div
        className={`flex flex-col border-r w-full lg:w-72 xl:w-80 flex-shrink-0 ${selectedNote ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Notes</h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleCreate}
            disabled={createNote.isPending}
          >
            <Plus className="h-4 w-4" />
            New note
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <NotesList
              notes={notes}
              selectedId={selectedNote?.id ?? null}
              onSelect={setSelectedNote}
            />
          )}
        </div>
      </div>

      {/* Editor panel */}
      <div className={`flex-1 flex flex-col ${selectedNote ? 'flex' : 'hidden lg:flex'}`}>
        {selectedNote ? (
          <>
            {/* Back button on mobile */}
            <div className="lg:hidden px-4 py-2 border-b">
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedNote(null)}
              >
                ← All notes
              </button>
            </div>
            <NoteEditor key={selectedNote.id} note={selectedNote} onDelete={handleDelete} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
            <StickyNote size={32} className="text-muted-foreground" />
            <p className="text-sm">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
