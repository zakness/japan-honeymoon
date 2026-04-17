-- Public Storage bucket for user-uploaded images (notes + text-note itinerary items).
-- Open-anon access mirrors the app's existing RLS model (no auth, two-person private app).
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-images', 'trip-images', true)
ON CONFLICT (id) DO NOTHING;

-- No SELECT policy on storage.objects — public buckets serve objects via
-- direct URL (no auth required), and omitting SELECT prevents clients from
-- listing bucket contents via the Storage API.

CREATE POLICY "trip-images anon insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'trip-images');

CREATE POLICY "trip-images anon update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'trip-images');

CREATE POLICY "trip-images anon delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'trip-images');
