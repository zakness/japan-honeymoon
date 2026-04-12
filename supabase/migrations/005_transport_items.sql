-- ============================================================
-- Transport Items
-- ============================================================
CREATE TABLE transport_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_date         DATE NOT NULL,
  type             TEXT NOT NULL,
  origin           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  departure_time   TIME NOT NULL,
  arrival_time     TIME,
  confirmation     TEXT,
  notes            TEXT,
  time_slot        TEXT NOT NULL DEFAULT 'morning',
  sort_order       INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transport_items_type_check
    CHECK (type IN ('shinkansen', 'local_train', 'ferry', 'bus', 'taxi', 'subway')),
  CONSTRAINT transport_items_time_slot_check
    CHECK (time_slot IN ('morning', 'afternoon', 'evening'))
);

CREATE INDEX transport_items_day_date_sort_idx ON transport_items (day_date, sort_order);

CREATE TRIGGER transport_items_updated_at
  BEFORE UPDATE ON transport_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE transport_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON transport_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON transport_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
