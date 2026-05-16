import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAdjacentTripDates } from '@/lib/trip-calendar'
import { getCityColor, getDayByDate, getPrimaryCityForDate } from '@/config/trip'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "Fri May 22" — weekday + month + day, no comma. */
function formatHeaderDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return `${WEEKDAY_SHORT[d.getDay()]} ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`
}

interface TripDayHeaderProps {
  /** Currently-shown day (YYYY-MM-DD). Must be a TRIP_DAYS date. */
  dayDate: string
  /** Fires with a new trip date when a chevron is tapped. */
  onSelectDay: (dayDate: string) => void
  /** Fires when the central label is tapped — opens the calendar picker. */
  onOpenPicker: () => void
}

/**
 * Mobile-only header bar that replaces the dual CityStrip + DayStrip stack.
 *
 *   [<]   Day 7 · Tokyo ▾   [>]
 *
 * Chevrons traverse `TRIP_DAYS` in global trip order — pressing `>` at the
 * last day of a city crosses into the next city. The tappable central label
 * opens the calendar picker for non-adjacent jumps.
 */
export function TripDayHeader({ dayDate, onSelectDay, onOpenPicker }: TripDayHeaderProps) {
  const day = getDayByDate(dayDate)
  const primaryCity = getPrimaryCityForDate(dayDate)
  const colors = primaryCity ? getCityColor(primaryCity) : null
  const { prev, next } = getAdjacentTripDates(dayDate)

  // Label: `Fri May 22 · <city label>`. Transit days use the trip-day's own
  // `label` (e.g. "Tokyo → Hakone") which already carries the arrow.
  const labelText = day ? `${formatHeaderDate(dayDate)} · ${day.label}` : formatHeaderDate(dayDate)

  return (
    <div className="shrink-0 border-b bg-background flex items-center px-2 py-1.5 gap-1">
      <button
        type="button"
        onClick={() => prev && onSelectDay(prev)}
        disabled={!prev}
        aria-label="Previous day"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onOpenPicker}
        aria-haspopup="dialog"
        className={cn(
          'flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          colors ? '' : 'bg-muted text-muted-foreground'
        )}
        style={colors ? { backgroundColor: colors.tint, color: colors.primary } : undefined}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
      </button>
      <button
        type="button"
        onClick={() => next && onSelectDay(next)}
        disabled={!next}
        aria-label="Next day"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
