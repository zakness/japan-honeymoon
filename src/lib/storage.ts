import { supabase } from './supabase'

export const TRIP_IMAGES_BUCKET = 'trip-images'

export type StorageOwnerKind = 'places' | 'notes' | 'note-items'

/**
 * Build the object path inside the bucket. Paths are namespaced by owner kind +
 * id so that cascade deletion can target a single prefix when needed. The
 * filename is expected to be a uuid + extension produced by the uploader.
 */
export function buildStoragePath(
  kind: StorageOwnerKind,
  ownerId: string,
  filename: string
): string {
  return `${kind}/${ownerId}/${filename}`
}

/**
 * Parse a Supabase public URL back into the bucket-relative path so we can
 * call `storage.remove([...paths])`. Returns null for URLs that don't belong to
 * this bucket (e.g. Google Places photo URIs on place rows).
 */
export function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${TRIP_IMAGES_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

/**
 * Fire-and-forget Storage cleanup. Used by mutation hooks after a row delete —
 * errors are logged but never thrown so a Storage hiccup can't leave orphaned
 * rows. Non-Supabase URLs (e.g. Google photo URIs) are filtered out.
 */
export async function deleteStorageObjects(urls: readonly string[]): Promise<void> {
  const paths = urls.map(extractStoragePath).filter((p): p is string => p !== null)
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(TRIP_IMAGES_BUCKET).remove(paths)
  if (error) {
    console.error('[storage] failed to remove objects', { paths, error })
  }
}
