-- Multi-leg transport: convert transport_items to a journey header and move
-- per-leg fields into a new transport_legs child table. No backfill needed
-- (transport_items is empty).

-- 1. Drop per-leg columns from transport_items (now a journey header)
ALTER TABLE transport_items DROP CONSTRAINT IF EXISTS transport_items_type_check;
ALTER TABLE transport_items
  DROP COLUMN type,
  DROP COLUMN origin,
  DROP COLUMN destination,
  DROP COLUMN departure_time,
  DROP COLUMN arrival_time,
  DROP COLUMN confirmation;

-- 2. Add optional title override
ALTER TABLE transport_items ADD COLUMN title TEXT;

-- 3. Create transport_legs
CREATE TABLE transport_legs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id         UUID NOT NULL REFERENCES transport_items(id) ON DELETE CASCADE,
  leg_index            INTEGER NOT NULL,
  mode                 TEXT NOT NULL,
  origin_name          TEXT NOT NULL,
  origin_place_id      TEXT,
  origin_lat           DOUBLE PRECISION,
  origin_lng           DOUBLE PRECISION,
  destination_name     TEXT NOT NULL,
  destination_place_id TEXT,
  destination_lat      DOUBLE PRECISION,
  destination_lng      DOUBLE PRECISION,
  departure_time       TIME NOT NULL,
  arrival_time         TIME,
  is_booked            BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation         TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transport_legs_mode_check
    CHECK (mode IN ('shinkansen', 'local_train', 'ferry', 'bus', 'taxi', 'subway')),
  CONSTRAINT transport_legs_unique_index
    UNIQUE (transport_id, leg_index)
);

CREATE INDEX transport_legs_transport_id_idx ON transport_legs (transport_id);

CREATE TRIGGER transport_legs_updated_at
  BEFORE UPDATE ON transport_legs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE transport_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON transport_legs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON transport_legs FOR ALL TO authenticated USING (true) WITH CHECK (true);
