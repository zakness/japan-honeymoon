import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PLACE_CATEGORIES, type PlaceRow } from '@/types/places'

interface NestPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  candidates: PlaceRow[]
  onSelect: (place: PlaceRow) => void
  emptyLabel?: string
}

/**
 * Modal picker for nesting actions: "Add child" and "Add to parent…". Caller
 * supplies the filtered candidate list; this component just handles search +
 * selection. Selecting fires `onSelect` and closes.
 */
export function NestPicker({
  open,
  onOpenChange,
  title,
  candidates,
  onSelect,
  emptyLabel = 'No candidates available',
}: NestPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((p) => p.name.toLowerCase().includes(q))
  }, [candidates, search])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setSearch('')
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter places…"
            className="h-8 pl-7 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              {search ? 'No matches' : emptyLabel}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((p) => {
                const Icon = PLACE_CATEGORIES.find((c) => c.value === p.category)?.icon
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(p)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Icon && <Icon size={14} className="shrink-0 text-muted-foreground" />}
                      <span className="flex-1 truncate">{p.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
