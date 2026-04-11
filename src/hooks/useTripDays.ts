import { TRIP_DAYS, getDayByDate, getPrimaryCityForDate, type TripDay, type City } from '@/config/trip'

export function useTripDays() {
  return TRIP_DAYS
}

export function useTripDay(date: string): TripDay | undefined {
  return getDayByDate(date)
}

export function usePrimaryCityForDate(date: string): City | undefined {
  return getPrimaryCityForDate(date)
}
