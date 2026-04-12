import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CITY_LABELS, type City } from '@/config/trip'

const CITIES = Object.keys(CITY_LABELS) as City[]

interface CityStripProps {
  selectedCity: City
  onSelectCity: (city: City) => void
}

export function CityStrip({ selectedCity, onSelectCity }: CityStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedCity])

  return (
    <div className="border-b bg-background shrink-0">
      <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-1 px-3 py-2">
          {CITIES.map((city) => {
            const isSelected = city === selectedCity
            return (
              <button
                key={city}
                ref={isSelected ? selectedRef : null}
                onClick={() => onSelectCity(city)}
                className={cn(
                  'shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {CITY_LABELS[city]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
