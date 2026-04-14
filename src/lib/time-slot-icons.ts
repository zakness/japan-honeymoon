import { Moon, Sun, Sunrise, type LucideIcon } from 'lucide-react'
import type { TimeSlot } from '@/types/itinerary'

/**
 * Shared icon mapping for the three time-of-day slots. Reused by the day
 * column headings, the Add dialog's segmented toggle, and anywhere else we
 * surface a slot visually.
 */
export const TIME_SLOT_ICONS: Record<TimeSlot, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
}
