import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { NoteCard } from './NoteCard'
import { useReorderNotes } from '@/hooks/useNotes'
import type { NoteRow } from '@/types/notes'

interface NotesListProps {
  notes: NoteRow[]
  selectedId: string | null
  onSelect: (note: NoteRow) => void
}

export function NotesList({ notes, selectedId, onSelect }: NotesListProps) {
  const reorder = useReorderNotes()
  const [activeNote, setActiveNote] = useState<NoteRow | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const note = notes.find((n) => n.id === event.active.id)
    setActiveNote(note ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveNote(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = notes.findIndex((n) => n.id === active.id)
    const newIndex = notes.findIndex((n) => n.id === over.id)
    const reordered = arrayMove(notes, oldIndex, newIndex)

    reorder.mutate(reordered.map((note, idx) => ({ id: note.id, sort_order: idx })))
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <p className="text-3xl">📝</p>
        <p className="text-sm font-medium">No notes yet</p>
        <p className="text-xs text-muted-foreground">Create your first note above</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              selected={note.id === selectedId}
              onClick={() => onSelect(note)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeNote && (
          <div className="shadow-lg opacity-90">
            <NoteCard note={activeNote} selected={false} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
