import type { AccommodationRow } from '@/types/accommodations'

export type City = 'tokyo' | 'hakone' | 'kyoto' | 'naoshima' | 'osaka'

export interface CityColor {
  primary: string
  tint: string
}

export interface TripDay {
  date: string // YYYY-MM-DD
  dayNumber: number
  cities: City[]
  isTransit: boolean
  label: string // display label
}

export const TRIP_DAYS: TripDay[] = [
  { date: '2026-05-16', dayNumber: 1, cities: ['tokyo'], isTransit: false, label: 'Tokyo' },
  { date: '2026-05-17', dayNumber: 2, cities: ['tokyo'], isTransit: false, label: 'Tokyo' },
  { date: '2026-05-18', dayNumber: 3, cities: ['tokyo'], isTransit: false, label: 'Tokyo' },
  { date: '2026-05-19', dayNumber: 4, cities: ['tokyo'], isTransit: false, label: 'Tokyo' },
  { date: '2026-05-20', dayNumber: 5, cities: ['tokyo'], isTransit: false, label: 'Tokyo' },
  { date: '2026-05-21', dayNumber: 6, cities: ['tokyo'], isTransit: false, label: 'Tokyo' },
  {
    date: '2026-05-22',
    dayNumber: 7,
    cities: ['tokyo', 'hakone'],
    isTransit: true,
    label: 'Tokyo → Hakone',
  },
  { date: '2026-05-23', dayNumber: 8, cities: ['hakone'], isTransit: false, label: 'Hakone' },
  {
    date: '2026-05-24',
    dayNumber: 9,
    cities: ['hakone', 'kyoto'],
    isTransit: true,
    label: 'Hakone → Kyoto',
  },
  { date: '2026-05-25', dayNumber: 10, cities: ['kyoto'], isTransit: false, label: 'Kyoto' },
  { date: '2026-05-26', dayNumber: 11, cities: ['kyoto'], isTransit: false, label: 'Kyoto' },
  {
    date: '2026-05-27',
    dayNumber: 12,
    cities: ['kyoto', 'naoshima'],
    isTransit: true,
    label: 'Kyoto → Naoshima',
  },
  { date: '2026-05-28', dayNumber: 13, cities: ['naoshima'], isTransit: false, label: 'Naoshima' },
  {
    date: '2026-05-29',
    dayNumber: 14,
    cities: ['naoshima', 'osaka'],
    isTransit: true,
    label: 'Naoshima → Osaka',
  },
  { date: '2026-05-30', dayNumber: 15, cities: ['osaka'], isTransit: true, label: 'Osaka → NYC' },
]

export const CITY_LABELS: Record<City, string> = {
  tokyo: 'Tokyo',
  hakone: 'Hakone',
  kyoto: 'Kyoto',
  naoshima: 'Naoshima',
  osaka: 'Osaka',
}

export function getDayByDate(date: string): TripDay | undefined {
  return TRIP_DAYS.find((d) => d.date === date)
}

export function getPrimaryCityForDate(date: string): City | undefined {
  const day = getDayByDate(date)
  return day?.cities[day.cities.length - 1]
}

export function getDaysForCity(city: City): TripDay[] {
  return TRIP_DAYS.filter((d) => d.cities.includes(city))
}

export const CITY_MAP_CENTER: Record<City, { lat: number; lng: number; zoom: number }> = {
  tokyo: { lat: 35.682, lng: 139.753, zoom: 12 },
  hakone: { lat: 35.232, lng: 139.107, zoom: 12 },
  kyoto: { lat: 35.011, lng: 135.768, zoom: 13 },
  naoshima: { lat: 34.461, lng: 133.993, zoom: 14 },
  osaka: { lat: 34.694, lng: 135.502, zoom: 13 },
}

/**
 * Per-city color palette. Each city has a `primary` (solid foreground, e.g. text
 * or pin fills) and a `tint` (~90–95% lightness background for pills and day
 * headers). Cities with multiple hotels may define `variants` — ordered by the
 * hotel's `check_in_date`, so the first hotel slept at in that city gets
 * variant[0], the second gets variant[1], etc.
 */
export const CITY_COLORS: Record<City, CityColor & { variants?: CityColor[] }> = {
  tokyo: {
    primary: '#7c3aed', // violet — neon/electric urban
    tint: '#ede9fe',
    variants: [
      { primary: '#7c3aed', tint: '#ede9fe' }, // 1st Tokyo hotel (Hotel Indigo)
      { primary: '#db2777', tint: '#fce7f3' }, // 2nd Tokyo hotel (Yuen Bettei) — rose
    ],
  },
  hakone: { primary: '#0891b2', tint: '#cffafe' }, // cyan-teal — lake + onsen
  kyoto: { primary: '#be123c', tint: '#ffe4e6' }, // crimson — torii/shrines
  naoshima: { primary: '#ca8a04', tint: '#fef3c7' }, // gold — Kusama pumpkin
  osaka: { primary: '#ea580c', tint: '#ffedd5' }, // orange — Dōtonbori
}

const FALLBACK_COLOR: CityColor = { primary: '#6b7280', tint: '#f3f4f6' }

/**
 * Returns the canonical city color (ignoring any hotel-specific variants).
 * Use this for surfaces that represent the city itself — city strip buttons,
 * day column headers, etc.
 */
export function getCityColor(city: City): CityColor {
  const entry = CITY_COLORS[city]
  return { primary: entry.primary, tint: entry.tint }
}

/**
 * Returns the color for a specific hotel. Hotels in cities that define
 * `variants` get their variant assigned by `check_in_date` order — the first
 * hotel you check into in that city gets variants[0], the second gets
 * variants[1], etc. Hotels in single-hotel cities just get the city primary.
 *
 * Falls back to a neutral gray if the hotel has no city or the city isn't in
 * the palette.
 */
export function getHotelColor(hotel: AccommodationRow, allHotels: AccommodationRow[]): CityColor {
  if (!hotel.city || !(hotel.city in CITY_COLORS)) return FALLBACK_COLOR
  const city = hotel.city as City
  const entry = CITY_COLORS[city]

  if (!entry.variants) return { primary: entry.primary, tint: entry.tint }

  const sameCity = allHotels
    .filter((h) => h.city === city)
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
  const idx = sameCity.findIndex((h) => h.id === hotel.id)

  if (idx < 0 || idx >= entry.variants.length) {
    return { primary: entry.primary, tint: entry.tint }
  }
  return entry.variants[idx]
}
