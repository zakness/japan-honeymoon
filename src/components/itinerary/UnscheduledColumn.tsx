import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PlaceForm } from '@/components/places/PlaceForm'
import { PlacesBrowseList } from './PlacesBrowseList'
import { cn } from '@/lib/utils'
import { type City } from '@/config/trip'
import type { PlaceRow } from '@/types/places'
import type { SelectPlaceHandler, SelectionOrigin } from '@/components/layout/AppShell'

interface UnscheduledColumnProps {
  city: City
  /** Unified selection handler — routes clicks into AppShell's lifted state. */
  onSelectPlace: SelectPlaceHandler
  /** Currently-selected place (or null). Used for card highlight. */
  selectedPlace: PlaceRow | null
  /** Where the current selection originated — used for the auto-scroll skip rule. */
  selectionOrigin: SelectionOrigin | null
  /**
   * When true, the column fills its parent's width and disables the
   * collapse-to-rail affordance. Default false — desktop renders the column at
   * fixed width, sticky-left.
   */
  fillWidth?: boolean
}

/**
 * Desktop-only sticky-left backlog sidebar. The list body is delegated to
 * `PlacesBrowseList`; this shell owns the chrome (header with title + add +
 * collapse, collapsed-rail mode).
 *
 * On mobile, the same `PlacesBrowseList` is rendered inside the FAB
 * `PlacesSheet`'s Browse tab instead — no sidebar shell, no inline `+`
 * (capture happens via the FAB's Add tab).
 */
export function UnscheduledColumn({
  city,
  onSelectPlace,
  selectedPlace,
  selectionOrigin,
  fillWidth = false,
}: UnscheduledColumnProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [addPlaceOpen, setAddPlaceOpen] = useState(false)

  if (collapsed && !fillWidth) {
    return (
      <div className="w-10 shrink-0 flex flex-col border-r sticky left-0 z-10 bg-muted/40 h-full">
        <button
          onClick={() => setCollapsed(false)}
          className="flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Expand places"
        >
          <span
            className="text-xs font-medium"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Places
          </span>
        </button>
        <div className="flex items-center justify-center pb-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col bg-muted/40 h-full',
          fillWidth ? 'w-full' : 'w-64 shrink-0 border-r sticky left-0 z-10'
        )}
      >
        <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              Places
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setAddPlaceOpen(true)}
              className="h-6 w-6 rounded-full bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center"
              title="Add place"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
            {!fillWidth && (
              <button
                onClick={() => setCollapsed(true)}
                className="size-7 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
                title="Collapse"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <PlacesBrowseList
          city={city}
          onSelectPlace={onSelectPlace}
          selectedPlace={selectedPlace}
          selectionOrigin={selectionOrigin}
          enableDrag
        />
      </div>

      <Dialog open={addPlaceOpen} onOpenChange={setAddPlaceOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add place</DialogTitle>
          </DialogHeader>
          <PlaceForm
            defaultCity={city}
            onSuccess={() => setAddPlaceOpen(false)}
            onCancel={() => setAddPlaceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
