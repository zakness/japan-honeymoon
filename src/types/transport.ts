import type { ComponentType } from 'react'
import { TrainFront, Train, Ship, Bus, Car, TramFront } from 'lucide-react'
import type { Database } from './database'
import type { ItineraryItemWithPlace } from './itinerary'

export type TransportItemRow = Database['public']['Tables']['transport_items']['Row']
export type TransportItemInsert = Database['public']['Tables']['transport_items']['Insert']
export type TransportItemUpdate = Database['public']['Tables']['transport_items']['Update']

export type TransportLegRow = Database['public']['Tables']['transport_legs']['Row']
export type TransportLegInsert = Database['public']['Tables']['transport_legs']['Insert']
export type TransportLegUpdate = Database['public']['Tables']['transport_legs']['Update']

// Narrowed union type — DB stores as `string`
export type TransportMode = 'shinkansen' | 'local_train' | 'ferry' | 'bus' | 'taxi' | 'subway'

// Backwards-compat alias during transition; prefer TransportMode going forward
export type TransportType = TransportMode

export type TransportIcon = ComponentType<{ size?: number; className?: string; color?: string }>

export const TRANSPORT_MODES: { value: TransportMode; label: string; icon: TransportIcon }[] = [
  { value: 'shinkansen', label: 'Shinkansen', icon: TrainFront },
  { value: 'local_train', label: 'Local Train', icon: Train },
  { value: 'ferry', label: 'Ferry', icon: Ship },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'taxi', label: 'Taxi', icon: Car },
  { value: 'subway', label: 'Subway', icon: TramFront },
]

// Legacy export name — kept as alias so existing imports don't break mid-phase
export const TRANSPORT_TYPES = TRANSPORT_MODES

// Aggregate view: one transport_items parent row plus its ordered legs.
export type Journey = {
  parent: TransportItemRow
  legs: TransportLegRow[]
}

export type SlotItemKind = 'itinerary' | 'transport'

export type SlotItem =
  | { kind: 'itinerary'; data: ItineraryItemWithPlace }
  | { kind: 'transport'; data: Journey }
