import type { Database } from './database'
import type { ItineraryItemWithPlace } from './itinerary'

export type TransportItemRow = Database['public']['Tables']['transport_items']['Row']
export type TransportItemInsert = Database['public']['Tables']['transport_items']['Insert']
export type TransportItemUpdate = Database['public']['Tables']['transport_items']['Update']

// Narrowed union type — DB stores as `string`
export type TransportType = 'shinkansen' | 'local_train' | 'ferry' | 'bus' | 'taxi' | 'subway'

export const TRANSPORT_TYPES: { value: TransportType; label: string; icon: string }[] = [
  { value: 'shinkansen', label: 'Shinkansen', icon: '🚄' },
  { value: 'local_train', label: 'Local Train', icon: '🚃' },
  { value: 'ferry', label: 'Ferry', icon: '⛴️' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'taxi', label: 'Taxi', icon: '🚕' },
  { value: 'subway', label: 'Subway', icon: '🚇' },
]

export type SlotItemKind = 'itinerary' | 'transport'

export type SlotItem =
  | { kind: 'itinerary'; data: ItineraryItemWithPlace }
  | { kind: 'transport'; data: TransportItemRow }
