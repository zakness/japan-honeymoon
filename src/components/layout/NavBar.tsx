import { Map, CalendarDays, NotebookText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AppView = 'map' | 'day' | 'notes'

const TABS: { id: AppView; label: string; Icon: typeof Map }[] = [
  { id: 'map', label: 'Map', Icon: Map },
  { id: 'day', label: 'Day', Icon: CalendarDays },
  { id: 'notes', label: 'Notes', Icon: NotebookText },
]

interface NavBarProps {
  activeView: AppView
  onViewChange: (view: AppView) => void
  mobile?: boolean
}

export function NavBar({ activeView, onViewChange, mobile }: NavBarProps) {
  if (mobile) {
    return (
      <nav className="flex">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
              activeView === id ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', activeView === id ? 'stroke-[2.5]' : '')} />
            {label}
          </button>
        ))}
      </nav>
    )
  }

  return (
    <nav className="border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-1">
        <span className="mr-4 font-semibold text-sm tracking-tight">🇯🇵 Japan 2026</span>
        <div className="flex gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeView === id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
