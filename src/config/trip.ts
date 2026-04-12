export type City = 'tokyo' | 'hakone' | 'kyoto' | 'naoshima' | 'osaka'

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
