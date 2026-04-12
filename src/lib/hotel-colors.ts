import type { AccommodationRow } from '@/types/accommodations'

export const HOTEL_COLORS = [
  '#7c3aed', // violet  — Hotel Indigo
  '#2563eb', // blue    — Yuen Bettei
  '#059669', // emerald — Nazuna Hakone
  '#d97706', // amber   — Ace Hotel Kyoto
  '#db2777', // pink    — Vacation House YOKOMBO
  '#0891b2', // cyan    — Swissotel Osaka
]

// Light background tints paired with each color for use as banner backgrounds
export const HOTEL_BG_COLORS = [
  '#ede9fe', // violet tint
  '#dbeafe', // blue tint
  '#d1fae5', // emerald tint
  '#fef3c7', // amber tint
  '#fce7f3', // pink tint
  '#cffafe', // cyan tint
]

export function getHotelColor(hotel: AccommodationRow, allHotels: AccommodationRow[]): string {
  const idx = allHotels.indexOf(hotel)
  return HOTEL_COLORS[idx % HOTEL_COLORS.length]
}

export function getHotelBgColor(hotel: AccommodationRow, allHotels: AccommodationRow[]): string {
  const idx = allHotels.indexOf(hotel)
  return HOTEL_BG_COLORS[idx % HOTEL_BG_COLORS.length]
}
