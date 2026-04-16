import type { ComponentType } from 'react'
import { TrainFront, Train, Ship, Bus, Car, TramFront } from 'lucide-react'
import type { Database } from './database'
import type { ItineraryItemWithPlace } from './itinerary'

export type TransportItemRow = Database['public']['Tables']['transport_items']['Row']
export type TransportItemInsert = Database['public']['Tables']['transport_items']['Insert']
export type TransportItemUpdate = Database['public']['Tables']['transport_items']['Update']

// Narrowed union type — DB stores as `string`
export type TransportType = 'shinkansen' | 'local_train' | 'ferry' | 'bus' | 'taxi' | 'subway'

export type TransportIcon = ComponentType<{ size?: number; className?: string; color?: string }>

export const TRANSPORT_TYPES: { value: TransportType; label: string; icon: TransportIcon }[] = [
  { value: 'shinkansen', label: 'Shinkansen', icon: TrainFront },
  { value: 'local_train', label: 'Local Train', icon: Train },
  { value: 'ferry', label: 'Ferry', icon: Ship },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'taxi', label: 'Taxi', icon: Car },
  { value: 'subway', label: 'Subway', icon: TramFront },
]

export type SlotItemKind = 'itinerary' | 'transport'

export type SlotItem =
  | { kind: 'itinerary'; data: ItineraryItemWithPlace }
  | { kind: 'transport'; data: TransportItemRow }
