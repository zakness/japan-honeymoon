import * as React from 'react'

import { Input } from '@/components/ui/input'

type Props = Omit<React.ComponentProps<typeof Input>, 'onChange'> & {
  onValueChange: (value: string) => void
}

// Wraps <Input> for type="time" / "date" / "datetime-local" and mirrors the
// value to onValueChange on both change and blur. Safari's native pickers can
// render a placeholder time/date while the underlying value stays empty until
// the input is fully committed; syncing on blur ensures React state matches
// what the user sees before they click Save.
export function DateTimeInput({ onValueChange, ...props }: Props) {
  return (
    <Input
      {...props}
      onChange={(e) => onValueChange(e.target.value)}
      onBlur={(e) => onValueChange(e.target.value)}
    />
  )
}
