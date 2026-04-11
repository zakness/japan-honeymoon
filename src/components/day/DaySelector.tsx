import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { TRIP_DAYS, CITY_LABELS, type City } from '@/config/trip'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DaySelectorProps {
  selectedDate: string
  onSelectDate: (date: string) => void
}

export function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Scroll selected day into view on mount and on change
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  return (
    <div className="border-b bg-background">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-1 px-3 py-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {TRIP_DAYS.map((day) => {
          const date = new Date(day.date + 'T00:00:00')
          const dayName = DAY_NAMES[date.getDay()]
          const dayNum = date.getDate()
          const isSelected = day.date === selectedDate
          const cityLabel = day.cities.map((c) => CITY_LABELS[c as City]).join('→')

          return (
            <button
              key={day.date}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center rounded-lg px-3 py-1.5 text-center transition-colors min-w-[72px]',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="text-xs font-medium">{dayName}</span>
              <span className={cn('text-lg font-bold leading-tight', isSelected ? '' : 'text-foreground')}>
                {dayNum}
              </span>
              <span className={cn('text-[10px] leading-tight truncate max-w-[64px]', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {cityLabel}
              </span>
              {day.isTransit && (
                <span className="text-[9px] mt-0.5 opacity-60">✈</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
