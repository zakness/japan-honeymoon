-- ============================================================
-- Japan Honeymoon Trip Planner — Initial Schema
-- ============================================================

-- ------------------------------------------------------------
-- updated_at trigger function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- places
-- ============================================================
CREATE TABLE places (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id  TEXT UNIQUE,
  name             TEXT NOT NULL,
  address          TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  rating           REAL,
  price_level      SMALLINT,
  hours            JSONB,
  website          TEXT,
  phone            TEXT,
  photos           JSONB,
  category         TEXT NOT NULL,
  tags             TEXT[],
  priority         TEXT NOT NULL DEFAULT 'want-to',
  status           TEXT NOT NULL DEFAULT 'researching',
  notes            TEXT,
  city             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT places_category_check
    CHECK (category IN ('restaurant', 'cafe_bar', 'shopping', 'attraction', 'nature_park')),
  CONSTRAINT places_priority_check
    CHECK (priority IN ('must-do', 'want-to', 'if-time')),
  CONSTRAINT places_status_check
    CHECK (status IN ('researching', 'booked', 'visited')),
  CONSTRAINT places_price_level_check
    CHECK (price_level BETWEEN 0 AND 4)
);

CREATE INDEX places_google_place_id_idx ON places (google_place_id);
CREATE INDEX places_category_idx ON places (category);
CREATE INDEX places_priority_idx ON places (priority);
CREATE INDEX places_city_idx ON places (city);

CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON places FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON places FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- itinerary_items
-- ============================================================
CREATE TABLE itinerary_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_date    DATE NOT NULL,
  place_id    UUID REFERENCES places (id) ON DELETE SET NULL,
  text_note   TEXT,
  time_slot   TEXT NOT NULL DEFAULT 'morning',
  sort_order  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT itinerary_items_time_slot_check
    CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
  CONSTRAINT itinerary_items_content_check
    CHECK (place_id IS NOT NULL OR text_note IS NOT NULL)
);

CREATE INDEX itinerary_items_day_date_sort_idx ON itinerary_items (day_date, sort_order);
CREATE INDEX itinerary_items_place_id_idx ON itinerary_items (place_id);

CREATE TRIGGER itinerary_items_updated_at
  BEFORE UPDATE ON itinerary_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON itinerary_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON itinerary_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- notes
-- ============================================================
CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notes_sort_order_idx ON notes (sort_order);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
