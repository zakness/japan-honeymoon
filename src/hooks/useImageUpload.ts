import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  TRIP_IMAGES_BUCKET,
  buildStoragePath,
  deleteStorageObjects,
  type StorageOwnerKind,
} from '@/lib/storage'
import { compressImage } from '@/lib/image-compression'

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Compress + upload one or more File/Blob inputs to the trip-images bucket
 * under `{kind}/{ownerId}/` and return public URLs suitable for storing in the
 * row's `images` JSONB column. Failures surface via the returned promise.
 */
export function useUploadImages(ownerKind: StorageOwnerKind, ownerId: string) {
  const [uploading, setUploading] = useState(false)

  async function upload(files: readonly File[]): Promise<string[]> {
    if (files.length === 0) return []
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of files) {
        const compressed = await compressImage(file)
        const filename = `${randomId()}.${compressed.extension}`
        const path = buildStoragePath(ownerKind, ownerId, filename)
        const { error } = await supabase.storage
          .from(TRIP_IMAGES_BUCKET)
          .upload(path, compressed.blob, {
            contentType: compressed.mimeType,
            upsert: false,
          })
        if (error) throw error
        const { data } = supabase.storage.from(TRIP_IMAGES_BUCKET).getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      return urls
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading }
}

/**
 * Fire-and-forget removal of storage objects referenced by their public URLs.
 * Non-Supabase URLs are filtered out, so callers can pass mixed arrays (e.g.
 * notes.images = [...userUploads, ...googlePhotos]) without special-casing.
 */
export function useDeleteImages() {
  return (urls: readonly string[]) => deleteStorageObjects(urls)
}
