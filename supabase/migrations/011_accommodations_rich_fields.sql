-- Adds rich-place-style fields to accommodations so hotels can carry the same
-- Google-Places-backed metadata (rating, photos, phone, etc.) plus user-curated
-- tags and notes that places already support. Column names mirror `places`
-- exactly so a future "extract shared core" migration is a column move, not
-- a rename.
ALTER TABLE accommodations ADD COLUMN google_place_id TEXT UNIQUE;
ALTER TABLE accommodations ADD COLUMN rating REAL;
ALTER TABLE accommodations ADD COLUMN photos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE accommodations ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE accommodations ADD COLUMN notes TEXT;
ALTER TABLE accommodations ADD COLUMN phone TEXT;
