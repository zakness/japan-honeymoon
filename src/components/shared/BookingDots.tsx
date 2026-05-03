import { cn } from '@/lib/utils'

interface BookingDotsProps {
  legs: Array<{ booking_status: string }>
  className?: string
}

export function BookingDots({ legs, className }: BookingDotsProps) {
  if (legs.length === 0) return null
  return (
    <span className={cn('flex items-center gap-0.5 font-mono text-[10px] leading-none', className)}>
      {legs.map((leg, i) => {
        if (leg.booking_status === 'booked') {
          return (
            <span key={i} className="text-green-600" aria-label="booked">
              ●
            </span>
          )
        }
        if (leg.booking_status === 'not_needed') {
          return (
            <span key={i} className="text-muted-foreground" aria-label="no booking needed">
              –
            </span>
          )
        }
        return (
          <span key={i} className="text-red-500" aria-label="not booked">
            ○
          </span>
        )
      })}
    </span>
  )
}
