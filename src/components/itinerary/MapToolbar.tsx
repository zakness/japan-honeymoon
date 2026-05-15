import { useEffect, useRef, useState } from 'react'
import { Crosshair, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCityColor, getDaysForCity, type City } from '@/config/trip'
import { ALL_DAYS } from './CityMap'

interface MapToolbarProps {
  city: City
  /** `'all'` or a `YYYY-MM-DD` day in the city. */
  selectedDay: string
  onSelectDay: (day: string) => void
  showUnscheduled: boolean
  onShowUnscheduledChange: (v: boolean) => void
  onRecenter: () => void
}

/**
 * Desktop chrome above the city map. Left: a segmented control for filtering
 * scheduled-place pins by day (or `All`). Right of that: a toggle to overlay
 * the unscheduled-backlog pins. Far right: a recenter button that fits the map
 * to the currently-visible pins.
 *
 * The day strip scrolls horizontally with edge-fade masks (mirroring
 * `DayStrip`'s mobile pattern) so Tokyo's ~8 cells fit in a narrow map column.
 */
export function MapToolbar({
  city,
  selectedDay,
  onSelectDay,
  showUnscheduled,
  onShowUnscheduledChange,
  onRecenter,
}: MapToolbarProps) {
  const days = getDaysForCity(city)
  const { tint } = getCityColor(city)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [fades, setFades] = useState({ left: false, right: false })

  function updateFades() {
    const el = scrollerRef.current
    if (!el) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setFades((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  useEffect(() => {
    updateFades()
  }, [city])
  useEffect(() => {
    window.addEventListener('resize', updateFades)
    return () => window.removeEventListener('resize', updateFades)
  }, [])

  const maskImage = `linear-gradient(to right, ${fades.left ? 'transparent' : 'black'} 0px, black 16px, black calc(100% - 16px), ${fades.right ? 'transparent' : 'black'} 100%)`

  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-background px-2 py-1.5">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollerRef}
          onScroll={updateFades}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', maskImage, WebkitMaskImage: maskImage }}
        >
          <div className="flex gap-0.5">
            <DayCell
              isSelected={selectedDay === ALL_DAYS}
              tint={tint}
              onClick={() => onSelectDay(ALL_DAYS)}
              label="All"
            />
            {days.map((day) => {
              // Bare day-of-month from a YYYY-MM-DD string; trip is entirely
              // in May so there's no ambiguity.
              const dom = Number(day.date.slice(8, 10))
              return (
                <DayCell
                  key={day.date}
                  isSelected={selectedDay === day.date}
                  tint={tint}
                  onClick={() => onSelectDay(day.date)}
                  label={String(dom)}
                />
              )
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onShowUnscheduledChange(!showUnscheduled)}
        aria-pressed={showUnscheduled}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
          showUnscheduled
            ? 'bg-secondary text-secondary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        title={showUnscheduled ? 'Hide unscheduled places' : 'Show unscheduled places'}
      >
        {showUnscheduled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        Unscheduled
      </button>

      <button
        type="button"
        onClick={onRecenter}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Recenter map"
        aria-label="Recenter map"
      >
        <Crosshair className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface DayCellProps {
  isSelected: boolean
  tint: string
  onClick: () => void
  label: string
}

function DayCell({ isSelected, tint, onClick, label }: DayCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
      style={isSelected ? { backgroundColor: tint } : undefined}
    >
      {label}
    </button>
  )
}
