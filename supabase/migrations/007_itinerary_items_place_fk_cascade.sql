-- Change place_id FK to CASCADE so deleting a place removes its itinerary items.
-- Previously SET NULL, which violated the content check constraint on rows with no text_note.
ALTER TABLE itinerary_items
  DROP CONSTRAINT itinerary_items_place_id_fkey,
  ADD CONSTRAINT itinerary_items_place_id_fkey
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE;
