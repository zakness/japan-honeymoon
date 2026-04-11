import { useState, useEffect, useRef, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { GooglePlaceData } from '@/types/places'
import { useGooglePlaceDetails } from '@/hooks/useGooglePlaceDetails'
import { usePlaceByGoogleId } from '@/hooks/usePlaces'

interface Suggestion {
  placeId: string
  mainText: string
  secondaryText: string
}

interface PlaceSearchProps {
  onPlaceSelected: (data: GooglePlaceData, existingId?: string) => void
  placeholder?: string
  className?: string
}

export function PlaceSearch({ onPlaceSelected, placeholder = 'Search for a place…', className }: PlaceSearchProps) {
  const placesLib = useMapsLibrary('places')
  const { fetchDetails, loading: detailsLoading } = useGooglePlaceDetails()

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if selected place is already cached in Supabase
  const { data: existingPlace } = usePlaceByGoogleId(selectedPlaceId)

  // Refresh session token when the library loads
  useEffect(() => {
    if (!placesLib) return
    const { AutocompleteSessionToken } = placesLib as typeof google.maps.places
    sessionTokenRef.current = new AutocompleteSessionToken()
  }, [placesLib])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!placesLib || input.length < 2) {
        setSuggestions([])
        setOpen(false)
        return
      }

      setLoading(true)
      try {
        const { AutocompleteSuggestion } = placesLib as typeof google.maps.places
        const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionTokenRef.current ?? undefined,
          // Bias results toward Japan
          locationBias: {
            center: { lat: 36.2048, lng: 138.2529 },
            radius: 50_000,
          },
        })

        setSuggestions(
          raw
            .filter((s) => s.placePrediction !== null)
            .map((s) => ({
              placeId: s.placePrediction!.placeId,
              mainText: s.placePrediction!.mainText?.toString() ?? '',
              secondaryText: s.placePrediction!.secondaryText?.toString() ?? '',
            }))
        )
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    },
    [placesLib]
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 200)
  }

  async function handleSelect(suggestion: Suggestion) {
    setOpen(false)
    setQuery(suggestion.mainText)
    setSelectedPlaceId(suggestion.placeId)

    // Rotate session token after selection (billing optimization)
    if (placesLib) {
      const { AutocompleteSessionToken } = placesLib as typeof google.maps.places
      sessionTokenRef.current = new AutocompleteSessionToken()
    }

    const details = await fetchDetails(suggestion.placeId)
    if (details) {
      onPlaceSelected(details, existingPlace?.id)
    }
  }

  const isLoading = loading || detailsLoading

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onMouseDown={(e) => e.preventDefault()} // prevent input blur before click fires
                onClick={() => handleSelect(s)}
              >
                <span className="font-medium">{s.mainText}</span>
                {s.secondaryText && (
                  <span className="ml-1.5 text-muted-foreground">{s.secondaryText}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
