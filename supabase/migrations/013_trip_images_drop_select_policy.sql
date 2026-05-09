-- Public buckets serve objects via direct URL without requiring SELECT on
-- storage.objects. Dropping the SELECT policy prevents clients from listing
-- bucket contents via the Storage API (addresses advisor warning
-- public_bucket_allows_listing).
DROP POLICY IF EXISTS "trip-images anon read" ON storage.objects;
