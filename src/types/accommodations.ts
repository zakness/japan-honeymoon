import type { Database } from './database'

export type AccommodationRow = Database['public']['Tables']['accommodations']['Row']

/**
 * Whether a hotel's stay covers a given day. Both endpoints inclusive: the
 * check-in date counts (you arrive that day) and the check-out date counts
 * (you leave that day — and there's a check-out itinerary event on it).
 * Used by the map's day filter to mirror `places` filtering behavior.
 */
export function hotelCoversDay(
  hotel: Pick<AccommodationRow, 'check_in_date' | 'check_out_date'>,
  date: string
): boolean {
  return date >= hotel.check_in_date && date <= hotel.check_out_date
}
