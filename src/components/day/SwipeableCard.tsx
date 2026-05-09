import { useCallback, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * One action in a swipeable card's reveal panel.
 *
 * The panel renders these as full-height, equally-spaced buttons stacked icon
 * over label.
 */
export type CardAction = {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

// ── One-at-a-time coordination ──────────────────────────────────────────────
// Module-level subject so opening any card snaps every other card closed. We
// pass the opening card's id with the broadcast and each subscriber compares
// against its own id to decide whether to react.
type Listener = (openedId: symbol | null) => void
const openListeners = new Set<Listener>()
function announceOpen(id: symbol | null) {
  openListeners.forEach((l) => l(id))
}

const SWIPE_AXIS_LOCK_PX = 8
const COMMIT_THRESHOLD_RATIO = 0.4

interface SwipeableCardProps {
  actions: CardAction[]
  children: React.ReactNode
  /** Background class for the foreground panel — must be opaque so the action
   *  panel underneath is hidden at rest. Defaults to `bg-card`. */
  foregroundClassName?: string
  /** Forwarded to the foreground click target. The action panel sits behind
   *  the foreground; this wires the foreground itself to its click handler. */
  onForegroundClick?: () => void
}

/**
 * Mobile-only swipe-to-reveal action wrapper. Drag the foreground left to
 * uncover an action panel; past ~40% of the card width the gesture commits
 * and snaps fully open. Tap a button to fire the action and auto-close. Tap
 * anywhere outside (or open another card) to dismiss.
 *
 * Vertical scrolls are released early via the same axis-lock pattern as
 * `DayColumnSwiper` so list scrolling still works on the same surface.
 */
export function SwipeableCard({
  actions,
  children,
  foregroundClassName = 'bg-card',
  onForegroundClick,
}: SwipeableCardProps) {
  const idRef = useRef<symbol>(Symbol())
  const containerRef = useRef<HTMLDivElement>(null)
  const foregroundRef = useRef<HTMLDivElement>(null)

  // `offset` is the current translateX of the foreground (positive = slid
  // left, revealing the panel from the right). When at rest: 0 if closed,
  // containerWidth if open. While dragging: tracks the gesture.
  const [offset, setOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)
  const isOpen = offset > 0

  // Drag state held in refs so handlers don't have stale closures. We only
  // surface them as state when needed for re-render.
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const activePointerId = useRef<number | null>(null)
  const locked = useRef(false)
  const containerWidthRef = useRef(0)
  const startOffsetRef = useRef(0)

  // Snap closed when someone else opens.
  useEffect(() => {
    const id = idRef.current
    const listener: Listener = (openedId) => {
      if (openedId !== id) {
        setIsAnimating(true)
        setOffset(0)
      }
    }
    openListeners.add(listener)
    return () => {
      openListeners.delete(listener)
    }
  }, [])

  // Outside-tap dismissal while open.
  useEffect(() => {
    if (!isOpen) return
    function handleDocPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsAnimating(true)
        setOffset(0)
      }
    }
    document.addEventListener('pointerdown', handleDocPointerDown)
    return () => document.removeEventListener('pointerdown', handleDocPointerDown)
  }, [isOpen])

  const close = useCallback(() => {
    setIsAnimating(true)
    setOffset(0)
  }, [])

  const handleActionClick = useCallback(
    (action: CardAction) => {
      action.onClick()
      close()
    },
    [close]
  )

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (activePointerId.current !== null) return
    activePointerId.current = e.pointerId
    startX.current = e.clientX
    startY.current = e.clientY
    locked.current = false
    containerWidthRef.current = containerRef.current?.getBoundingClientRect().width || 0
    startOffsetRef.current = offset
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current) return
    if (startX.current === null || startY.current === null) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_AXIS_LOCK_PX) {
        startX.current = null
        startY.current = null
        activePointerId.current = null
        return
      }
      if (Math.abs(dx) < SWIPE_AXIS_LOCK_PX) return
      locked.current = true
      setIsAnimating(false)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore — pointer might already be released
      }
    }
    // dx negative = swipe left; offset grows. dx positive = swipe right; offset shrinks.
    const next = Math.max(0, Math.min(containerWidthRef.current, startOffsetRef.current - dx))
    setOffset(next)
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current) return
    activePointerId.current = null
    if (locked.current) {
      const width = containerWidthRef.current
      const threshold = width * COMMIT_THRESHOLD_RATIO
      const wasOpen = startOffsetRef.current > 0
      // Commit if past the threshold from the starting state.
      let nextOffset: number
      if (!wasOpen && offset > threshold) {
        nextOffset = width
      } else if (wasOpen && offset < width - threshold) {
        nextOffset = 0
      } else {
        nextOffset = wasOpen ? width : 0
      }
      setIsAnimating(true)
      setOffset(nextOffset)
      if (nextOffset > 0) {
        announceOpen(idRef.current)
      }
    }
    startX.current = null
    startY.current = null
    locked.current = false
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Action panel — sits behind the foreground. We deliberately do NOT
          mark it aria-hidden at rest: swipe gestures aren't accessible to
          screen-reader users, so the buttons need to remain announced and
          focusable via SR navigation even when visually covered by the
          foreground. We do toggle tabIndex so sighted keyboard users follow
          the same visual disclosure as touch users. */}
      <div className="absolute inset-0 flex">
        {actions.map((action, idx) => {
          const Icon = action.icon
          const destructive = action.variant === 'destructive'
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleActionClick(action)}
              tabIndex={isOpen ? 0 : -1}
              aria-label={action.label}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors',
                destructive
                  ? 'bg-destructive/90 text-white hover:bg-destructive'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="leading-none">{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Foreground — slides left on swipe to reveal panel */}
      <div
        ref={foregroundRef}
        className={cn('relative', foregroundClassName)}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: isAnimating ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          // Tap to dismiss when open; otherwise forward to the card's own
          // click handler. After a real swipe the locked ref stays true until
          // this same gesture's pointerup; by the time `click` fires we're
          // back to false.
          if (isOpen) {
            e.preventDefault()
            e.stopPropagation()
            close()
            return
          }
          onForegroundClick?.()
        }}
      >
        {children}
      </div>
    </div>
  )
}
