-- ============================================================
-- Flights (seed data, read-only)
-- ============================================================
CREATE TABLE flights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline       TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  dep_airport   TEXT NOT NULL,
  arr_airport   TEXT NOT NULL,
  departure_at  TIMESTAMPTZ NOT NULL,
  arrival_at    TIMESTAMPTZ NOT NULL,
  confirmation  TEXT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER flights_updated_at
  BEFORE UPDATE ON flights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for anon"          ON flights FOR SELECT TO anon          USING (true);
CREATE POLICY "Allow read for authenticated" ON flights FOR SELECT TO authenticated USING (true);

-- Seed flights
INSERT INTO flights (airline, flight_number, dep_airport, arr_airport, departure_at, arrival_at, confirmation, notes) VALUES
('Japan Airlines', 'JL5',         'JFK', 'HND', '2026-05-15T17:35:00Z', '2026-05-16T07:40:00Z', 'CGN3RT', NULL),
('Japan Airlines', 'JL224 / JL4', 'KIX', 'JFK', '2026-05-30T05:50:00Z', '2026-05-30T22:30:00Z', 'AATWNB', 'Via HND (2h 20m layover)');

-- ============================================================
-- Add optional check-in/check-out times to accommodations
-- ============================================================
ALTER TABLE accommodations
  ADD COLUMN check_in_time  TIME,
  ADD COLUMN check_out_time TIME;
