import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { deleteStorageObjects } from '@/lib/storage'
import type { NoteRow, NoteInsert, NoteUpdate } from '@/types/notes'

const NOTES_KEY = ['notes'] as const

// ---- Queries ----

export function useNotes() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as NoteRow[]
    },
  })
}

// ---- Mutations ----

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: NoteInsert) => {
      const { data, error } = await supabase.from('notes').insert(note).select().single()
      if (error) throw error
      return data as NoteRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: NoteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('notes')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as NoteRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch images first so we can clean up Storage objects *after* the
      // row is gone — we can't rely on a DB trigger because anon can't hold
      // the service role key.
      const { data: existing } = await supabase
        .from('notes')
        .select('images')
        .eq('id', id)
        .maybeSingle()
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
      const urls = Array.isArray(existing?.images) ? (existing.images as string[]) : []
      if (urls.length > 0) void deleteStorageObjects(urls)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}

export interface ReorderNote {
  id: string
  sort_order: number
}

export function useReorderNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notes: ReorderNote[]) => {
      const updates = notes.map(({ id, sort_order }) =>
        supabase.from('notes').update({ sort_order }).eq('id', id)
      )
      const results = await Promise.all(updates)
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async (notes) => {
      await queryClient.cancelQueries({ queryKey: NOTES_KEY })
      const previous = queryClient.getQueryData(NOTES_KEY)

      queryClient.setQueryData(NOTES_KEY, (old: NoteRow[] | undefined) => {
        if (!old) return old
        return old
          .map((note) => {
            const update = notes.find((u) => u.id === note.id)
            return update ? { ...note, sort_order: update.sort_order } : note
          })
          .sort((a, b) => a.sort_order - b.sort_order)
      })

      return { previous }
    },
    onError: (_err, _notes, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTES_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY })
    },
  })
}
