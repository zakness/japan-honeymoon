ALTER TABLE itinerary_items
  ADD COLUMN is_decided BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any existing item with a reservation time is implicitly decided.
UPDATE itinerary_items
SET is_decided = true
WHERE reservation_time IS NOT NULL;
