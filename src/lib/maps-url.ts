interface MapsTarget {
  google_place_id?: string | null
  lat?: number | null
  lng?: number | null
  address?: string | null
}

// Use the universal Maps URL with `api=1` — this is the format Google
// documents for cross-platform links that deep-link into the iOS/Android app
// when installed. The older `maps/place/?q=place_id:XYZ` format opens the app
// but the app then treats the literal string as a search query and shows
// "place not found". `query_place_id` requires `query` to be present too, so
// we pair the place id with coordinates (or address) as the visible query.
export function googleMapsUrl(target: MapsTarget): string | null {
  const query =
    target.lat != null && target.lng != null
      ? `${target.lat},${target.lng}`
      : target.address
        ? encodeURIComponent(target.address)
        : null

  if (target.google_place_id && query) {
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${target.google_place_id}`
  }
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${query}`
  }
  return null
}
