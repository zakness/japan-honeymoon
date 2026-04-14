import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TIME_SLOTS, type TimeSlot } from '@/types/itinerary'

interface SortableItemCardProps {
  id: string
  data: Record<string, unknown>
  children: ReactNode
  actions?: ReactNode
  /**
   * Visual variant. `speculative` renders a dashed, faded card to distinguish
   * "maybe" items from locked-in plans. Defaults to `decided`.
   */
  variant?: 'decided' | 'speculative'
  /**
   * Hex color used to tint a `decided` card's border and shadow. Ignored for
   * speculative cards. Typically the city's `primary` color.
   */
  accentColor?: string
}

/**
 * Shared shell for draggable itinerary/transport cards: sortable wrapper,
 * drag handle, and a top-right action tray that only reserves layout space
 * when hovered (via absolute positioning).
 */
export function SortableItemCard({
  id,
  data,
  children,
  actions,
  variant = 'decided',
  accentColor,
}: SortableItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
  })

  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
  }

  // Decided cards get a city-tinted border + colored shadow when an accent is
  // provided. Hex+alpha suffix: `55` ≈ 33% (border), `33` ≈ 20% (shadow).
  const style: React.CSSProperties =
    variant === 'decided' && accentColor
      ? {
          ...baseStyle,
          borderColor: `${accentColor}55`,
          boxShadow: `0 1px 3px 0 ${accentColor}33, 0 1px 2px -1px ${accentColor}33`,
        }
      : baseStyle

  const variantClasses =
    variant === 'speculative'
      ? 'border-dashed border-muted-foreground/40 bg-transparent'
      : accentColor
        ? 'bg-card'
        : 'bg-card shadow-sm'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-start gap-2 rounded-lg border p-2.5 group ${variantClasses}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">{children}</div>

      {actions && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-card/95 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  )
}

interface TimeSlotMenuProps {
  timeSlot: TimeSlot
  children: ReactNode
}

/**
 * Compact Clock-icon dropdown trigger. Renders the base-ui Trigger AS the
 * Button (via `render`) to avoid nested <button><button> markup. Consumers
 * supply the menu body as children.
 */
export function TimeSlotMenu({ timeSlot, children }: TimeSlotMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            type="button"
            aria-label={`Time slot: ${timeSlot}`}
          />
        }
      >
        <Clock className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TimeSlotMenuItemsProps {
  current: TimeSlot
  onChange: (slot: TimeSlot) => void
}

/** Renders the standard TIME_SLOTS as DropdownMenuItems with the current slot bolded. */
export function TimeSlotMenuItems({ current, onChange }: TimeSlotMenuItemsProps) {
  return (
    <>
      {TIME_SLOTS.map((slot) => (
        <DropdownMenuItem
          key={slot.value}
          onClick={() => onChange(slot.value)}
          className={current === slot.value ? 'font-medium' : ''}
        >
          {slot.label}
        </DropdownMenuItem>
      ))}
    </>
  )
}

interface DeleteItemButtonProps {
  onDelete: () => void
  label?: string
}

export function DeleteItemButton({ onDelete, label = 'Delete item' }: DeleteItemButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      onClick={onDelete}
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
