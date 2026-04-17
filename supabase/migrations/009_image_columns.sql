-- Adds JSONB images arrays for user-uploaded photos on freeform notes and on
-- itinerary_items with a text_note (place-backed items inherit place photos).
ALTER TABLE notes ADD COLUMN images JSONB;
ALTER TABLE itinerary_items ADD COLUMN images JSONB;
