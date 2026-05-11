import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useArchivePlace, useDeletePlaceRaw, useUnnestPlace } from '@/hooks/usePlaces'
import { PLACE_CATEGORIES, type PlaceRow, type PlacePriority } from '@/types/places'

export type ResolveMode = 'archive' | 'delete'

/** Per-child resolution: do the parent's action to the child too, or keep the
 *  child as a standalone (un-nest first). */
type Resolution = 'apply' | 'keep'

interface ResolveChildrenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ResolveMode
  parent: PlaceRow
  /** Children to resolve. Archive mode passes unarchived children only; delete
   *  mode passes all children. */
  children: PlaceRow[]
  /** Called after the entire flow (children + parent) completes successfully. */
  onResolved?: () => void
}

/**
 * Pre-flight dialog for archiving or deleting a parent place. The parent's
 * children must be resolved first — either taken along (archive/delete the
 * child too) or un-nested into the backlog. After every child is handled, the
 * parent's own archive/delete is performed.
 */
export function ResolveChildrenDialog({
  open,
  onOpenChange,
  mode,
  parent,
  children,
  onResolved,
}: ResolveChildrenDialogProps) {
  // Default: take everything along with the parent. Users opt-out per-child
  // for things they want to keep.
  const [choices, setChoices] = useState<Map<string, Resolution>>(
    () => new Map(children.map((c) => [c.id, 'apply']))
  )
  const [working, setWorking] = useState(false)

  const archive = useArchivePlace()
  const deleteRaw = useDeletePlaceRaw()
  const unnest = useUnnestPlace()

  const applyLabel = mode === 'archive' ? 'Archive too' : 'Delete too'
  const verb = mode === 'archive' ? 'Archive' : 'Delete'
  const parentVerb = mode === 'archive' ? 'archive' : 'delete'

  function setChoice(id: string, resolution: Resolution) {
    setChoices((prev) => {
      const next = new Map(prev)
      next.set(id, resolution)
      return next
    })
  }

  async function handleSubmit() {
    setWorking(true)
    try {
      // 1. Un-nest every "keep as standalone" child first so the parent's
      //    "no unarchived children" / "no children" precondition becomes
      //    satisfiable.
      for (const child of children) {
        if (choices.get(child.id) === 'keep') {
          await unnest.mutateAsync(child.id)
        }
      }

      // 2. Apply the parent's action to "apply"-marked children.
      for (const child of children) {
        if (choices.get(child.id) !== 'apply') continue
        if (mode === 'archive') {
          await archive.mutateAsync({
            id: child.id,
            priorPriority: child.priority as PlacePriority,
          })
        } else {
          // Use raw delete so the children guard doesn't kick in (children
          // never have their own children — one-level rule).
          await deleteRaw.mutateAsync(child.id)
        }
      }

      // 3. Perform the parent's action.
      if (mode === 'archive') {
        await archive.mutateAsync({
          id: parent.id,
          priorPriority: parent.priority as PlacePriority,
        })
      } else {
        await deleteRaw.mutateAsync(parent.id)
      }

      toast.success(`${verb}d ${parent.name}`)
      onOpenChange(false)
      onResolved?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${parentVerb}`
      toast.error(msg)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !working && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {verb} {parent.name}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {mode === 'archive'
            ? `${parent.name} has unarchived places added to it. Decide what to do with each before archiving.`
            : `${parent.name} has places added to it. Decide what to do with each before deleting.`}
        </p>
        <ul className="max-h-80 overflow-y-auto space-y-2 -mx-2">
          {children.map((child) => {
            const Icon = PLACE_CATEGORIES.find((c) => c.value === child.category)?.icon
            const choice = choices.get(child.id) ?? 'apply'
            return (
              <li key={child.id} className="rounded-md border bg-card px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  {Icon && <Icon size={14} className="shrink-0 text-muted-foreground" />}
                  <span className="flex-1 truncate font-medium">{child.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <ChoiceButton
                    active={choice === 'apply'}
                    onClick={() => setChoice(child.id, 'apply')}
                  >
                    {applyLabel}
                  </ChoiceButton>
                  <ChoiceButton
                    active={choice === 'keep'}
                    onClick={() => setChoice(child.id, 'keep')}
                  >
                    Keep separate
                  </ChoiceButton>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={working}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={working}
            className={
              mode === 'delete'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {working ? `${verb}ing…` : verb}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
          : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
