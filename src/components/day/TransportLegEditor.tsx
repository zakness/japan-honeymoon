import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateTimeInput } from '@/components/ui/datetime-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlaceSearch } from '@/components/places/PlaceSearch'
import { TRANSPORT_MODES, type TransportMode } from '@/types/transport'
import type { LegDraft } from '@/hooks/useTransport'
import type { GooglePlaceData } from '@/types/places'
import { cn } from '@/lib/utils'

interface TransportLegEditorProps {
  legs: LegDraft[]
  onChange: (legs: LegDraft[]) => void
}

function emptyLeg(previous?: LegDraft): LegDraft {
  return {
    mode: previous?.mode ?? 'shinkansen',
    origin_name: previous?.destination_name ?? '',
    origin_place_id: previous?.destination_place_id ?? null,
    origin_lat: previous?.destination_lat ?? null,
    origin_lng: previous?.destination_lng ?? null,
    destination_name: '',
    destination_place_id: null,
    destination_lat: null,
    destination_lng: null,
    departure_time: previous?.arrival_time ?? '',
    arrival_time: null,
    is_booked: false,
    confirmation: null,
    notes: null,
  }
}

export function TransportLegEditor({ legs, onChange }: TransportLegEditorProps) {
  function patchLeg(index: number, patch: Partial<LegDraft>) {
    onChange(legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)))
  }

  function removeLeg(index: number) {
    onChange(legs.filter((_, i) => i !== index))
  }

  function moveLeg(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= legs.length) return
    const next = [...legs]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function addLeg() {
    onChange([...legs, emptyLeg(legs[legs.length - 1])])
  }

  function applyEndpoint(index: number, endpoint: 'origin' | 'destination', data: GooglePlaceData) {
    const patch: Partial<LegDraft> =
      endpoint === 'origin'
        ? {
            origin_name: data.name,
            origin_place_id: data.googlePlaceId,
            origin_lat: data.lat,
            origin_lng: data.lng,
          }
        : {
            destination_name: data.name,
            destination_place_id: data.googlePlaceId,
            destination_lat: data.lat,
            destination_lng: data.lng,
          }
    patchLeg(index, patch)
  }

  return (
    <div className="space-y-3">
      {legs.map((leg, index) => {
        const modeMeta = TRANSPORT_MODES.find((m) => m.value === (leg.mode as TransportMode))
        const ModeIcon = modeMeta?.icon
        const departureMissing = !leg.departure_time
        const originMissing = !leg.origin_name
        const destinationMissing = !leg.destination_name

        return (
          <div
            key={leg.id ?? `draft-${index}`}
            className="rounded-md border bg-card/50 p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {ModeIcon && <ModeIcon size={14} />}
                <span>Leg {index + 1}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLeg(index, -1)}
                  disabled={index === 0}
                  aria-label="Move leg up"
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLeg(index, 1)}
                  disabled={index === legs.length - 1}
                  aria-label="Move leg down"
                >
                  <ArrowDown size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLeg(index)}
                  disabled={legs.length <= 1}
                  aria-label="Remove leg"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mode</Label>
              <div
                role="radiogroup"
                aria-label="Transport mode"
                className="inline-flex w-full h-9 items-center rounded-lg bg-muted p-[3px] text-muted-foreground"
              >
                {TRANSPORT_MODES.map((m) => {
                  const Icon = m.icon
                  const active = leg.mode === m.value
                  return (
                    <button
                      key={m.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={m.label}
                      title={m.label}
                      onClick={() => patchLeg(index, { mode: m.value })}
                      className={cn(
                        'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-md text-foreground/60 transition-all hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring',
                        active && 'bg-background text-foreground shadow-sm'
                      )}
                    >
                      <Icon size={16} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs truncate block">
                  Origin
                  {leg.origin_name && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {leg.origin_name}
                    </span>
                  )}
                </Label>
                <PlaceSearch
                  mode="lookup"
                  placeholder={leg.origin_name ? 'Change origin…' : 'Origin…'}
                  onPlaceSelected={(data) => applyEndpoint(index, 'origin', data)}
                />
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-xs truncate block">
                  Destination
                  {leg.destination_name && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {leg.destination_name}
                    </span>
                  )}
                </Label>
                <PlaceSearch
                  mode="lookup"
                  placeholder={leg.destination_name ? 'Change destination…' : 'Destination…'}
                  onPlaceSelected={(data) => applyEndpoint(index, 'destination', data)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor={`leg-${index}-departure`}>
                  Depart
                </Label>
                <DateTimeInput
                  id={`leg-${index}-departure`}
                  type="time"
                  value={leg.departure_time}
                  onValueChange={(v) => patchLeg(index, { departure_time: v })}
                  aria-invalid={departureMissing}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor={`leg-${index}-arrival`}>
                  Arrive
                </Label>
                <DateTimeInput
                  id={`leg-${index}-arrival`}
                  type="time"
                  value={leg.arrival_time ?? ''}
                  onValueChange={(v) => patchLeg(index, { arrival_time: v || null })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-foreground"
                checked={leg.is_booked ?? false}
                onChange={(e) => patchLeg(index, { is_booked: e.target.checked })}
              />
              <span>Booked</span>
            </label>

            {leg.is_booked && (
              <div className="space-y-1">
                <Label className="text-xs" htmlFor={`leg-${index}-confirmation`}>
                  Confirmation (optional)
                </Label>
                <Input
                  id={`leg-${index}-confirmation`}
                  value={leg.confirmation ?? ''}
                  onChange={(e) => patchLeg(index, { confirmation: e.target.value || null })}
                  placeholder="e.g. CGN3RT"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs" htmlFor={`leg-${index}-notes`}>
                Notes (optional)
              </Label>
              <Textarea
                id={`leg-${index}-notes`}
                value={leg.notes ?? ''}
                onChange={(e) => patchLeg(index, { notes: e.target.value || null })}
                rows={2}
                placeholder="e.g. Car 4 reserved seat…"
              />
            </div>

            {(originMissing || destinationMissing || departureMissing) && (
              <p className="text-xs text-amber-600">
                {[
                  originMissing && 'origin',
                  destinationMissing && 'destination',
                  departureMissing && 'departure time',
                ]
                  .filter(Boolean)
                  .join(', ')}{' '}
                required
              </p>
            )}
          </div>
        )
      })}

      <Button type="button" variant="outline" className="w-full" onClick={addLeg}>
        + Add leg
      </Button>
    </div>
  )
}

export function legsAreValid(legs: LegDraft[]): boolean {
  if (legs.length === 0) return false
  return legs.every((l) => l.origin_name.trim() && l.destination_name.trim() && l.departure_time)
}
