import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteRow } from '@/types/notes'

interface NoteCardProps {
  note: NoteRow
  selected: boolean
  onClick: () => void
}

export function NoteCard({ note, selected, onClick }: NoteCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
  }

  const preview = note.body?.split('\n').find((l) => l.trim()) ?? ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors group',
        selected
          ? 'border-primary bg-primary/5'
          : 'bg-card hover:border-border/80 hover:bg-accent/30'
      )}
      onClick={onClick}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight truncate">{note.title}</p>
        {preview && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {preview}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {new Date(note.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}
