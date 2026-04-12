import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { TRIP_DAYS, CITY_LABELS, type City } from '@/config/trip'
import { useAccommodations } from '@/hooks/useAccommodations'
import type { AccommodationRow } from '@/types/accommodations'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Distinct colors per hotel slot (ordered by check-in date)
const HOTEL_COLORS = [
  '#7c3aed', // violet  — Hotel Indigo
  '#2563eb', // blue    — Yuen Bettei
  '#059669', // emerald — Nazuna Hakone
  '#d97706', // amber   — Ace Hotel Kyoto
  '#db2777', // pink    — Vacation House YOKOMBO
  '#0891b2', // cyan    — Swissotel Osaka
]

interface DaySelectorProps {
  selectedDate: string
  onSelectDate: (date: string) => void
}

function morningHotel(date: string, hotels: AccommodationRow[]): AccommodationRow | null {
  // Where you woke up: checked in before this date, checking out on or after
  return hotels.find((h) => h.check_in_date < date && date <= h.check_out_date) ?? null
}

function eveningHotel(date: string, hotels: AccommodationRow[]): AccommodationRow | null {
  // Where you're sleeping tonight: checking in on or before, checking out after
  return hotels.find((h) => h.check_in_date <= date && date < h.check_out_date) ?? null
}

export function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const { data: hotels = [] } = useAccommodations()

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  // Pre-compute morning/evening hotels per day for neighbor lookups
  const morningByDate = new Map(TRIP_DAYS.map((d) => [d.date, morningHotel(d.date, hotels)]))
  const eveningByDate = new Map(TRIP_DAYS.map((d) => [d.date, eveningHotel(d.date, hotels)]))

  function hotelColor(hotel: AccommodationRow | null): string | undefined {
    if (!hotel) return undefined
    return HOTEL_COLORS[hotels.indexOf(hotel) % HOTEL_COLORS.length]
  }

  return (
    <div className="border-b bg-background">
      {/*
        Single scrollable container — buttons row + hotel strip row scroll together.
        The inner div is wider than the viewport and both rows share the same width.
      */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {/*
          Single flex row of columns — each column holds one day button + its bar slot.
          The bar slot inherits the exact width of its sibling button, so they always align
          regardless of how wide the button grows due to city label content.
        */}
        <div className="flex gap-1 px-3 pt-2 pb-2">
          {TRIP_DAYS.map((day, i) => {
            const date = new Date(day.date + 'T00:00:00')
            const dayName = DAY_NAMES[date.getDay()]
            const dayNum = date.getDate()
            const isSelected = day.date === selectedDate
            const cityLabel = day.cities.map((c) => CITY_LABELS[c as City]).join('→')

            const morning = morningByDate.get(day.date) ?? null
            const evening = eveningByDate.get(day.date) ?? null
            const prevEvening = i > 0 ? (eveningByDate.get(TRIP_DAYS[i - 1].date) ?? null) : null
            const nextMorning =
              i < TRIP_DAYS.length - 1 ? (morningByDate.get(TRIP_DAYS[i + 1].date) ?? null) : null

            const leftConnected = morning !== null && prevEvening?.id === morning.id
            const rightConnected = evening !== null && nextMorning?.id === evening.id

            const mColor = hotelColor(morning)
            const eColor = hotelColor(evening)

            const isSwitch = morning !== null && evening !== null && morning.id !== evening.id
            const morningRight = isSwitch ? 'calc(50% + 1.5px)' : '50%'
            const eveningLeft = isSwitch ? 'calc(50% + 1.5px)' : '50%'

            const morningRightCap = morning !== null && morning.id !== evening?.id
            const eveningLeftCap = evening !== null && morning?.id !== evening.id

            const morningRadius = [
              leftConnected ? '0' : '3px',
              morningRightCap ? '3px' : '0',
              morningRightCap ? '3px' : '0',
              leftConnected ? '0' : '3px',
            ].join(' ')

            const eveningRadius = [
              eveningLeftCap ? '3px' : '0',
              rightConnected ? '0' : '3px',
              rightConnected ? '0' : '3px',
              eveningLeftCap ? '3px' : '0',
            ].join(' ')

            return (
              <div key={day.date} className="flex-shrink-0 flex flex-col min-w-[72px]">
                {/* Day button */}
                <button
                  ref={isSelected ? selectedRef : null}
                  onClick={() => onSelectDate(day.date)}
                  className={cn(
                    'flex flex-col items-center rounded-lg px-3 py-1.5 text-center transition-colors w-full',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-xs font-medium">{dayName}</span>
                  <span
                    className={cn(
                      'text-lg font-bold leading-tight',
                      isSelected ? '' : 'text-foreground'
                    )}
                  >
                    {dayNum}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] leading-tight truncate max-w-[64px]',
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {cityLabel}
                  </span>
                </button>

                {/* Hotel bar slot — same width as button above */}
                <div className="relative h-[5px] mt-1">
                  {morning && (
                    <span
                      className="absolute top-0 bottom-0"
                      style={{
                        left: leftConnected ? '-2px' : '0',
                        right: morningRight,
                        backgroundColor: mColor,
                        borderRadius: morningRadius,
                      }}
                    />
                  )}
                  {evening && (
                    <span
                      className="absolute top-0 bottom-0"
                      style={{
                        left: eveningLeft,
                        right: rightConnected ? '-2px' : '0',
                        backgroundColor: eColor,
                        borderRadius: eveningRadius,
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
