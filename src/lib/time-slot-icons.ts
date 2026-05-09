import {
  CloudSun,
  Coffee,
  Moon,
  Sun,
  Sunrise,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { TimeSlot } from '@/types/itinerary'

/**
 * Shared icon mapping for the 7 time-of-day slots. Reused by the day column
 * headings, the Add dialog's segmented picker, and anywhere else we surface
 * a slot visually. Order in the union doesn't matter here — order is dictated
 * by `TIME_SLOTS` in `@/types/itinerary`.
 */
export const TIME_SLOT_ICONS: Record<TimeSlot, LucideIcon> = {
  'wake-up': Sunrise,
  breakfast: Coffee,
  morning: Sun,
  lunch: UtensilsCrossed,
  afternoon: CloudSun,
  dinner: Utensils,
  evening: Moon,
}
