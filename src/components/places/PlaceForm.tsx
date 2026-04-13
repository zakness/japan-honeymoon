import { useState } from 'react'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlaceSearch } from './PlaceSearch'
import { useCreatePlace, useUpdatePlace } from '@/hooks/usePlaces'
import {
  PLACE_CATEGORIES,
  PLACE_PRIORITIES,
  PLACE_STATUSES,
  type PlaceRow,
  type GooglePlaceData,
  type PlaceCategory,
  type PlacePriority,
  type PlaceStatus,
} from '@/types/places'
import { CITY_LABELS, type City } from '@/config/trip'

interface PlaceFormProps {
  /** Existing place to edit. If undefined, form is in create mode. */
  place?: PlaceRow
  /** Pre-selects the city dropdown when creating a new place. */
  defaultCity?: City
  onSuccess?: (place: PlaceRow) => void
  onCancel?: () => void
}

interface FormState {
  googlePlaceId: string
  name: string
  address: string
  lat: string
  lng: string
  rating: string
  priceLevel: string
  website: string
  phone: string
  category: PlaceCategory
  priority: PlacePriority
  status: PlaceStatus
  city: City | ''
  notes: string
  tagInput: string
  tags: string[]
}

function placeToFormState(place: PlaceRow): FormState {
  return {
    googlePlaceId: place.google_place_id ?? '',
    name: place.name,
    address: place.address ?? '',
    lat: place.lat?.toString() ?? '',
    lng: place.lng?.toString() ?? '',
    rating: place.rating?.toString() ?? '',
    priceLevel: place.price_level?.toString() ?? '',
    website: place.website ?? '',
    phone: place.phone ?? '',
    category: (place.category as PlaceCategory) ?? 'attraction',
    priority: (place.priority as PlacePriority) ?? 'want-to',
    status: (place.status as PlaceStatus) ?? 'researching',
    city: (place.city as City) ?? '',
    notes: place.notes ?? '',
    tagInput: '',
    tags: place.tags ?? [],
  }
}

function emptyFormState(): FormState {
  return {
    googlePlaceId: '',
    name: '',
    address: '',
    lat: '',
    lng: '',
    rating: '',
    priceLevel: '',
    website: '',
    phone: '',
    category: 'attraction',
    priority: 'want-to',
    status: 'researching',
    city: '',
    notes: '',
    tagInput: '',
    tags: [],
  }
}

export function PlaceForm({ place, defaultCity, onSuccess, onCancel }: PlaceFormProps) {
  const isEditing = !!place
  const [manualMode, setManualMode] = useState(isEditing && !place.google_place_id)
  const [form, setForm] = useState<FormState>(
    isEditing ? placeToFormState(place) : { ...emptyFormState(), city: defaultCity ?? '' }
  )

  const createPlace = useCreatePlace()
  const updatePlace = useUpdatePlace()
  const isPending = createPlace.isPending || updatePlace.isPending

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleGooglePlaceSelected(data: GooglePlaceData) {
    setForm((prev) => ({
      ...prev,
      googlePlaceId: data.googlePlaceId,
      name: data.name,
      address: data.address,
      lat: data.lat.toString(),
      lng: data.lng.toString(),
      rating: data.rating?.toString() ?? '',
      priceLevel: data.priceLevel?.toString() ?? '',
      website: data.website ?? '',
      phone: data.phone ?? '',
    }))
  }

  function addTag() {
    const tag = form.tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) {
      set('tags', [...form.tags, tag])
    }
    set('tagInput', '')
  }

  function removeTag(tag: string) {
    set(
      'tags',
      form.tags.filter((t) => t !== tag)
    )
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.category) {
      toast.error('Category is required')
      return
    }

    const payload = {
      google_place_id: form.googlePlaceId || null,
      name: form.name.trim(),
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      rating: form.rating ? parseFloat(form.rating) : null,
      price_level: form.priceLevel ? parseInt(form.priceLevel) : null,
      website: form.website || null,
      phone: form.phone || null,
      category: form.category,
      priority: form.priority,
      status: form.status,
      city: form.city || null,
      notes: form.notes || null,
      tags: form.tags.length > 0 ? form.tags : null,
    }

    try {
      let result: PlaceRow
      if (isEditing) {
        result = await updatePlace.mutateAsync({ id: place.id, ...payload })
        toast.success('Place updated')
      } else {
        result = await createPlace.mutateAsync(payload)
        toast.success('Place saved')
      }
      onSuccess?.(result)
    } catch {
      toast.error(isEditing ? 'Failed to update place' : 'Failed to save place')
    }
  }

  const cities = Object.entries(CITY_LABELS) as [City, string][]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search or manual toggle */}
      {!isEditing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Search Google Maps</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2"
              onClick={() => setManualMode((m) => !m)}
            >
              {manualMode ? 'Search Google Maps' : 'Enter manually'}
            </button>
          </div>
          {!manualMode && (
            <PlaceSearch
              onPlaceSelected={handleGooglePlaceSelected}
              placeholder="Search for a restaurant, attraction…"
            />
          )}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Ichiran Ramen Shinjuku"
          required
        />
      </div>

      {/* Category + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => set('category', v as PlaceCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => set('priority', v as PlacePriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACE_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status + City */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v as PlaceStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Select value={form.city} onValueChange={(v) => set('city', v as City | '')}>
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {cities.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Address (editable) */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="e.g. 3-34-11 Shinjuku, Tokyo"
        />
      </div>

      {/* Website + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+81 3-…"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={form.tagInput}
            onChange={(e) => set('tagInput', e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag, press Enter"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Reservation at 7pm, cash only, recommended by…"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Saving…' : isEditing ? 'Update place' : 'Save place'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
