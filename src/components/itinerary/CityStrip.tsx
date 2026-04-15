import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CITY_LABELS, getCityColor, type City } from '@/config/trip'

const CITIES = Object.keys(CITY_LABELS) as City[]

interface CityStripProps {
  selectedCity: City
  onSelectCity: (city: City) => void
  /** Optional trailing content rendered after the scrollable city list, inside the same row. */
  trailing?: ReactNode
}

export function CityStrip({ selectedCity, onSelectCity, trailing }: CityStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedCity])

  return (
    <div className="border-b bg-background shrink-0 flex items-center">
      <div
        className="overflow-x-auto scrollbar-hide flex-1 min-w-0"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex gap-1 px-3 py-2">
          {CITIES.map((city) => {
            const isSelected = city === selectedCity
            const { primary } = getCityColor(city)
            return (
              <button
                key={city}
                ref={isSelected ? selectedRef : null}
                onClick={() => onSelectCity(city)}
                className={cn(
                  'shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  isSelected
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                style={isSelected ? { backgroundColor: primary } : undefined}
              >
                {CITY_LABELS[city]}
              </button>
            )
          })}
        </div>
      </div>
      {trailing && <div className="shrink-0 pr-2">{trailing}</div>}
    </div>
  )
}
