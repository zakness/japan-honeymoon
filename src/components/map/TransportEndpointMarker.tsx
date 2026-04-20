import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { TRANSPORT_MODES, type TransportMode } from '@/types/transport'
import { getModeStyle } from '@/config/transport'

interface TransportEndpointMarkerProps {
  lat: number
  lng: number
  mode: string
  label?: string
}

/**
 * Small neutral endpoint marker for journey legs. Renders a tinted dot with the
 * transport mode glyph — meant to sit under polylines and stay visually lighter
 * than place/hotel markers.
 */
export function TransportEndpointMarker({ lat, lng, mode, label }: TransportEndpointMarkerProps) {
  const modeMeta = TRANSPORT_MODES.find((m) => m.value === (mode as TransportMode))
  const Icon = modeMeta?.icon
  const { color } = getModeStyle(mode)

  return (
    <AdvancedMarker position={{ lat, lng }} zIndex={5}>
      <div
        className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: color }}
        title={label}
      >
        {Icon && <Icon size={10} color="white" />}
      </div>
    </AdvancedMarker>
  )
}
