import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { buildCalendarWeeks, type CalendarCell } from '@/lib/trip-calendar'
import { CITY_LABELS, getCityColor, type City } from '@/config/trip'

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const CITY_ORDER: City[] = ['tokyo', 'hakone', 'kyoto', 'naoshima', 'osaka']

interface TripCalendarSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
  /** Optional — highlights the cell representing "today" if present. */
  todayDate?: string
  onSelect: (dayDate: string) => void
}

/**
 * Bottom-sheet picker showing the full trip as a 3-week calendar grid.
 *
 * Same-city day runs render as a continuous tinted band behind the day
 * numbers; bands break at week wraps. Transit days carry an additional
 * left-half overlay in the origin city's tint, so the day reads as "leaving X
 * → arriving Y" at a glance. Tapping a cell closes the sheet and calls
 * `onSelect`.
 */
export function TripCalendarSheet({
  open,
  onOpenChange,
  selectedDate,
  todayDate,
  onSelect,
}: TripCalendarSheetProps) {
  const weeks = buildCalendarWeeks()

  function handleSelect(date: string) {
    onSelect(date)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl px-4 pt-3 pb-5 gap-3 max-h-[85dvh]"
        showCloseButton={false}
      >
        <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <SheetTitle className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trip calendar
        </SheetTitle>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {DOW_LABELS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="space-y-1.5">
          {weeks.map((week) => (
            <div key={week.startDate} className="grid grid-cols-7 gap-0">
              {week.cells.map((cell) => (
                <CalendarCellView
                  key={cell.date}
                  cell={cell}
                  isSelected={cell.date === selectedDate}
                  isToday={cell.date === todayDate}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1">
          {CITY_ORDER.map((city) => {
            const colors = getCityColor(city)
            return (
              <Fragment key={city}>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  {CITY_LABELS[city]}
                </span>
              </Fragment>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface CalendarCellViewProps {
  cell: CalendarCell
  isSelected: boolean
  isToday: boolean
  onSelect: (date: string) => void
}

function CalendarCellView({ cell, isSelected, isToday, onSelect }: CalendarCellViewProps) {
  if (cell.isEmpty) {
    return (
      <div className="aspect-square flex items-center justify-center text-xs text-muted-foreground/40">
        {new Date(cell.date + 'T00:00:00').getDate()}
      </div>
    )
  }

  const bandColors = cell.bandCity ? getCityColor(cell.bandCity) : null
  const originColors = cell.originCity ? getCityColor(cell.originCity) : null
  const dayNum = new Date(cell.date + 'T00:00:00').getDate()

  // Rounding flags come from `buildCalendarWeeks` so transit boundaries (where
  // an origin overlay abuts the previous cell's same-city band) read as a
  // single continuous shape instead of two curves facing each other.
  const bandRoundClass = cn(
    cell.bandRoundLeft && 'rounded-l-md',
    cell.bandRoundRight && 'rounded-r-md'
  )

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      className={cn(
        'relative aspect-square flex items-center justify-center text-xs font-medium transition-transform active:scale-95',
        isSelected ? 'text-foreground' : 'text-foreground/80'
      )}
      aria-pressed={isSelected}
      aria-label={`Day ${cell.tripDay?.dayNumber ?? ''} — ${cell.tripDay?.label ?? cell.date}`}
    >
      {/* Band background — base layer */}
      {bandColors && (
        <span
          aria-hidden
          className={cn('absolute inset-y-0.5 inset-x-0', bandRoundClass)}
          style={{ backgroundColor: bandColors.tint }}
        />
      )}
      {/* Transit-day origin overlay — covers the left half so the cell shows
          "leaving" tint on the left + "arriving" (band) tint on the right.
          The left edge rounds only when no same-city band sits in the prev
          cell — otherwise it connects flat. */}
      {originColors && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0.5 left-0 right-1/2',
            cell.originRoundLeft && 'rounded-l-md'
          )}
          style={{ backgroundColor: originColors.tint }}
        />
      )}
      {/* Selection ring — always a uniformly-rounded inset rectangle so it
          reads as "this cell is selected" independent of band rounding. */}
      {isSelected && bandColors && (
        <span
          aria-hidden
          className="absolute inset-y-0.5 inset-x-0 rounded-md ring-2 ring-inset"
          style={{ '--tw-ring-color': bandColors.primary } as React.CSSProperties}
        />
      )}
      {/* Day number */}
      <span className="relative">{dayNum}</span>
      {/* Today dot */}
      {isToday && (
        <span
          aria-hidden
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-foreground"
        />
      )}
    </button>
  )
}
