import type { TransportMode } from '@/types/transport'

export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export interface TransportModeStyle {
  /** Hex color for the map polyline and mode icon tint. */
  color: string
  /** Polyline dash pattern selector used by CityMap. */
  stroke: StrokeStyle
}

// Colors chosen to stay visually distinct from the city palette in
// `src/config/trip.ts` (violet / cyan / crimson / gold / orange) so that
// journey polylines read as a separate layer against city-tinted UI.
export const TRANSPORT_MODE_STYLES: Record<TransportMode, TransportModeStyle> = {
  shinkansen: { color: '#1d4ed8', stroke: 'solid' },
  local_train: { color: '#475569', stroke: 'solid' },
  ferry: { color: '#0d9488', stroke: 'dashed' },
  bus: { color: '#15803d', stroke: 'solid' },
  taxi: { color: '#f59e0b', stroke: 'dashed' },
  subway: { color: '#7c3aed', stroke: 'dotted' },
}

export function getModeStyle(mode: string): TransportModeStyle {
  return TRANSPORT_MODE_STYLES[mode as TransportMode] ?? { color: '#6b7280', stroke: 'solid' }
}
