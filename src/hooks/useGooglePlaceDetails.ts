import { useState, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { GooglePlaceData } from '@/types/places'

const FETCH_FIELDS = [
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'priceLevel',
  'regularOpeningHours',
  'websiteURI',
  'nationalPhoneNumber',
  'photos',
] as const

export function useGooglePlaceDetails() {
  const placesLib = useMapsLibrary('places')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDetails = useCallback(
    async (placeId: string): Promise<GooglePlaceData | null> => {
      if (!placesLib) return null
      setLoading(true)
      setError(null)

      try {
        // Use the new Places API (google.maps.places.Place)
        const { Place } = placesLib as typeof google.maps.places
        const place = new Place({ id: placeId })

        await place.fetchFields({ fields: FETCH_FIELDS as unknown as string[] })

        const location = place.location
        if (!location) throw new Error('Place has no location')

        // Extract up to 5 photo URIs
        const photos = place.photos
          ?.slice(0, 5)
          .map((p) => p.getURI({ maxWidth: 800, maxHeight: 600 }))
          .filter((uri): uri is string => !!uri) ?? []

        return {
          googlePlaceId: placeId,
          name: place.displayName ?? '',
          address: place.formattedAddress ?? '',
          lat: location.lat(),
          lng: location.lng(),
          rating: place.rating ?? undefined,
          priceLevel: place.priceLevel != null ? Number(place.priceLevel) : undefined,
          hours: place.regularOpeningHours ?? undefined,
          website: place.websiteURI ?? undefined,
          phone: place.nationalPhoneNumber ?? undefined,
          photos,
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        return null
      } finally {
        setLoading(false)
      }
    },
    [placesLib]
  )

  return { fetchDetails, loading, error }
}
