import { useEffect, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTripDateShort, getCityColor, getDaysForCity, type City } from '@/config/trip'

export const PLACES_TAB = 'places' as const
export type DayTabValue = typeof PLACES_TAB | string

interface DayStripProps {
  city: City
  selected: DayTabValue
  onSelect: (value: DayTabValue) => void
}

/**
 * Mobile-only sub-navigation: a horizontal tab strip that switches the sheet
 * content between the city's `Places` backlog and a single day's column.
 * Day tabs scroll inside their own area with edge-fade affordances; the
 * Places tab is pinned right since it isn't part of the swipe sequence.
 *
 * The strip shares its background with the swipe container below so it reads
 * as the same surface — the active day tab is the visual handoff to the card.
 */
export function DayStrip({ city, selected, onSelect }: DayStripProps) {
  const days = getDaysForCity(city)
  const { tint } = getCityColor(city)
  const selectedDayRef = useRef<HTMLButtonElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [fades, setFades] = useState({ left: false, right: false })

  function updateFades() {
    const el = scrollerRef.current
    if (!el) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setFades((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  // Center the selected day in the scroller. Use bounding rects (not
  // offsetLeft, which is relative to offsetParent and isn't necessarily the
  // scroller) and convert to scroll-content coordinates by adding scrollLeft.
  useEffect(() => {
    const scroller = scrollerRef.current
    const button = selectedDayRef.current
    if (!scroller || !button) return
    if (typeof scroller.scrollTo !== 'function') return // jsdom shim
    const sRect = scroller.getBoundingClientRect()
    const bRect = button.getBoundingClientRect()
    const buttonInContent = bRect.left - sRect.left + scroller.scrollLeft
    const target = buttonInContent - scroller.clientWidth / 2 + bRect.width / 2
    const max = scroller.scrollWidth - scroller.clientWidth
    scroller.scrollTo({ left: Math.max(0, Math.min(max, target)), behavior: 'smooth' })
  }, [selected, city])

  // Re-evaluate fades on city change (different number of tabs) and on resize.
  useEffect(() => {
    updateFades()
  }, [city])
  useEffect(() => {
    window.addEventListener('resize', updateFades)
    return () => window.removeEventListener('resize', updateFades)
  }, [])

  const maskImage = `linear-gradient(to right, ${fades.left ? 'transparent' : 'black'} 0px, black 16px, black calc(100% - 16px), ${fades.right ? 'transparent' : 'black'} 100%)`

  const placesActive = selected === PLACES_TAB

  return (
    <div className="bg-muted/40 flex shrink-0 items-center">
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollerRef}
          onScroll={updateFades}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', maskImage, WebkitMaskImage: maskImage }}
        >
          <div className="flex gap-1 px-3 py-2">
            {days.map((day) => {
              const isSelected = day.date === selected
              return (
                <button
                  key={day.date}
                  ref={isSelected ? selectedDayRef : null}
                  onClick={() => onSelect(day.date)}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={isSelected ? { backgroundColor: tint } : undefined}
                >
                  {formatTripDateShort(day.date)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="shrink-0 px-2 py-2">
        <button
          onClick={() => onSelect(PLACES_TAB)}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            placesActive
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Places
        </button>
      </div>
    </div>
  )
}
