import { useDndContext } from '@dnd-kit/core'

/**
 * Debug-only readout of dnd-kit state. Mount inside a `<DndContext>` and
 * enable by appending `?debug=dnd` to the URL. Shows the current `active.id`,
 * `active.data`, and `over.id` so you can confirm which droppable dnd-kit
 * thinks the pointer is on at any moment of the drag.
 *
 * No effect outside the debug flag; safe to leave mounted.
 */
export function DndDebugOverlay() {
  const enabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'dnd'
  const { active, over } = useDndContext()

  if (!enabled) return null

  const activeData = active?.data.current
  const dataPreview = activeData
    ? Object.entries(activeData)
        .filter(([k]) => k !== 'sortable')
        .map(([k, v]) => `${k}=${formatVal(v)}`)
        .join(' · ')
    : ''

  return (
    <div className="fixed bottom-3 right-3 z-[9999] pointer-events-none rounded-md bg-black/85 px-3 py-2 text-[11px] font-mono leading-tight text-white shadow-xl">
      <div className="font-semibold text-white/60 mb-1">dnd debug</div>
      <div>
        <span className="text-white/50">active:</span>{' '}
        <span className="text-amber-300">{active ? String(active.id) : '(none)'}</span>
      </div>
      {dataPreview && (
        <div className="max-w-[360px] truncate">
          <span className="text-white/50">data:</span>{' '}
          <span className="text-white/80">{dataPreview}</span>
        </div>
      )}
      <div>
        <span className="text-white/50">over:</span>{' '}
        <span className="text-emerald-300">{over ? String(over.id) : '(none)'}</span>
      </div>
    </div>
  )
}

function formatVal(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object' && 'id' in (v as Record<string, unknown>)) {
    return String((v as { id: unknown }).id)
  }
  return '…'
}
