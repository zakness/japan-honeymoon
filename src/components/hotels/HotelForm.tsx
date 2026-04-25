import { useState } from 'react'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateTimeInput } from '@/components/ui/datetime-input'
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
import { PlaceSearch } from '@/components/places/PlaceSearch'
import { PhotoGrid } from '@/components/places/PhotoGrid'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Lightbox } from '@/components/shared/Lightbox'
import { useLightbox } from '@/hooks/useLightbox'
import { useUpdateAccommodation } from '@/hooks/useAccommodations'
import { deleteStorageObjects } from '@/lib/storage'
import { markPrimaryPhoto, type GooglePlaceData } from '@/types/places'
import { CITY_LABELS, type City } from '@/config/trip'
import type { AccommodationRow } from '@/types/accommodations'

interface HotelFormProps {
  hotel: AccommodationRow
  onSuccess?: (hotel: AccommodationRow) => void
  onCancel?: () => void
}

interface FormState {
  googlePlaceId: string
  name: string
  address: string
  lat: string
  lng: string
  rating: string
  website: string
  phone: string
  city: City | ''
  notes: string
  tagInput: string
  tags: string[]
  photos: string[]
  // Hotel-only
  checkInDate: string
  checkOutDate: string
  checkInTime: string
  checkOutTime: string
  bookedBy: string
  bookingUrl: string
  confirmationInput: string
  confirmationNumbers: string[]
}

function hotelToFormState(h: AccommodationRow): FormState {
  return {
    googlePlaceId: h.google_place_id ?? '',
    name: h.name,
    address: h.address ?? '',
    lat: h.lat?.toString() ?? '',
    lng: h.lng?.toString() ?? '',
    rating: h.rating?.toString() ?? '',
    website: h.website ?? '',
    phone: h.phone ?? '',
    city: (h.city as City) ?? '',
    notes: h.notes ?? '',
    tagInput: '',
    tags: h.tags ?? [],
    photos: Array.isArray(h.photos) ? (h.photos as string[]) : [],
    checkInDate: h.check_in_date,
    checkOutDate: h.check_out_date,
    checkInTime: h.check_in_time?.slice(0, 5) ?? '',
    checkOutTime: h.check_out_time?.slice(0, 5) ?? '',
    bookedBy: h.booked_by ?? '',
    bookingUrl: h.booking_url ?? '',
    confirmationInput: '',
    confirmationNumbers: h.confirmation_numbers ?? [],
  }
}

export function HotelForm({ hotel, onSuccess, onCancel }: HotelFormProps) {
  const [manualMode, setManualMode] = useState(false)
  const [form, setForm] = useState<FormState>(hotelToFormState(hotel))
  const lightbox = useLightbox()

  const updateHotel = useUpdateAccommodation()
  const isPending = updateHotel.isPending

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
      website: data.website ?? '',
      phone: data.phone ?? '',
      // Merge Google photos with any user-uploaded ones already present
      photos: [
        ...(data.photos ?? []),
        ...prev.photos.filter((p) => !(data.photos ?? []).includes(p)),
      ],
    }))
  }

  function addTag() {
    const tag = form.tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) set('tags', [...form.tags, tag])
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

  function addConfirmation() {
    const c = form.confirmationInput.trim()
    if (c && !form.confirmationNumbers.includes(c)) {
      set('confirmationNumbers', [...form.confirmationNumbers, c])
    }
    set('confirmationInput', '')
  }

  function removeConfirmation(c: string) {
    set(
      'confirmationNumbers',
      form.confirmationNumbers.filter((x) => x !== c)
    )
  }

  function handleConfirmationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addConfirmation()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.checkInDate || !form.checkOutDate) {
      toast.error('Check-in and check-out dates are required')
      return
    }
    if (form.checkOutDate < form.checkInDate) {
      toast.error('Check-out must be on or after check-in')
      return
    }
    if (!form.city) {
      toast.error('City is required')
      return
    }

    const originalPhotos = Array.isArray(hotel.photos) ? (hotel.photos as string[]) : []
    const removed = originalPhotos.filter((u) => !form.photos.includes(u))

    const payload = {
      google_place_id: form.googlePlaceId || null,
      name: form.name.trim(),
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      rating: form.rating ? parseFloat(form.rating) : null,
      website: form.website || null,
      phone: form.phone || null,
      city: form.city,
      notes: form.notes || null,
      tags: form.tags,
      photos: form.photos,
      check_in_date: form.checkInDate,
      check_out_date: form.checkOutDate,
      check_in_time: form.checkInTime || null,
      check_out_time: form.checkOutTime || null,
      booked_by: form.bookedBy || null,
      booking_url: form.bookingUrl || null,
      confirmation_numbers: form.confirmationNumbers,
    }

    try {
      const result = await updateHotel.mutateAsync({ id: hotel.id, ...payload })
      if (removed.length > 0) void deleteStorageObjects(removed)
      toast.success('Hotel updated')
      onSuccess?.(result)
    } catch {
      toast.error('Failed to update hotel')
    }
  }

  const cities = Object.entries(CITY_LABELS) as [City, string][]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search or manual toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Look up on Google Maps</Label>
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
            placeholder="Search for the hotel…"
          />
        )}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <Label>City *</Label>
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

      {/* Check-in / Check-out dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="check-in-date">Check-in *</Label>
          <DateTimeInput
            id="check-in-date"
            type="date"
            value={form.checkInDate}
            onValueChange={(v) => set('checkInDate', v)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="check-out-date">Check-out *</Label>
          <DateTimeInput
            id="check-out-date"
            type="date"
            value={form.checkOutDate}
            onValueChange={(v) => set('checkOutDate', v)}
            required
          />
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="check-in-time">Check-in time</Label>
          <DateTimeInput
            id="check-in-time"
            type="time"
            value={form.checkInTime}
            onValueChange={(v) => set('checkInTime', v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="check-out-time">Check-out time</Label>
          <DateTimeInput
            id="check-out-time"
            type="time"
            value={form.checkOutTime}
            onValueChange={(v) => set('checkOutTime', v)}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
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

      {/* Booking URL + Booked by */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="booking-url">Booking URL</Label>
          <Input
            id="booking-url"
            value={form.bookingUrl}
            onChange={(e) => set('bookingUrl', e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booked-by">Booked by</Label>
          <Input
            id="booked-by"
            value={form.bookedBy}
            onChange={(e) => set('bookedBy', e.target.value)}
          />
        </div>
      </div>

      {/* Confirmation numbers */}
      <div className="space-y-1.5">
        <Label>Confirmation numbers</Label>
        <div className="flex gap-2">
          <Input
            value={form.confirmationInput}
            onChange={(e) => set('confirmationInput', e.target.value)}
            onKeyDown={handleConfirmationKeyDown}
            placeholder="Add number, press Enter"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addConfirmation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {form.confirmationNumbers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.confirmationNumbers.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 font-mono">
                {c}
                <button
                  type="button"
                  onClick={() => removeConfirmation(c)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
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

      {/* Photos — uploader manages add/remove/paste; grid below sets the primary
          when there's more than one photo. Both bind to the same form.photos
          array so a remove in either flows back to the same source. */}
      <div className="space-y-1.5">
        <Label>Photos</Label>
        <ImageUploader
          images={form.photos}
          onChange={(next) => set('photos', next)}
          ownerKind="hotels"
          ownerId={hotel.id}
          onOpenLightbox={(idx) => lightbox.openAt(form.photos, idx)}
        />
        {form.photos.length > 1 && (
          <>
            <PhotoGrid
              photos={form.photos}
              primaryUrl={form.photos[0]}
              onSelectPrimary={(url) => set('photos', markPrimaryPhoto(form.photos, url))}
            />
            <p className="text-xs text-muted-foreground">Click a photo to set it as the cover.</p>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Saving…' : 'Update hotel'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <Lightbox
        open={lightbox.open}
        images={lightbox.images}
        startIndex={lightbox.startIndex}
        onClose={lightbox.close}
      />
    </form>
  )
}
