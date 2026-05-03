interface MapsTarget {
  google_place_id?: string | null
  lat?: number | null
  lng?: number | null
  address?: string | null
}

export function googleMapsUrl(target: MapsTarget): string | null {
  if (target.google_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${target.google_place_id}`
  }
  if (target.lat != null && target.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`
  }
  if (target.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.address)}`
  }
  return null
}
