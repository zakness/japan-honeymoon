-- ============================================================
-- Accommodations (hotels) table + seed data
-- ============================================================

CREATE TABLE accommodations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  city                  TEXT NOT NULL,
  check_in_date         DATE NOT NULL,
  check_out_date        DATE NOT NULL,
  confirmation_numbers  TEXT[] NOT NULL DEFAULT '{}',
  booking_url           TEXT,
  address               TEXT,
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,
  website               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT accommodations_city_check
    CHECK (city IN ('tokyo', 'hakone', 'kyoto', 'naoshima', 'osaka')),
  CONSTRAINT accommodations_dates_check
    CHECK (check_out_date > check_in_date)
);

CREATE INDEX accommodations_check_in_date_idx ON accommodations (check_in_date);
CREATE INDEX accommodations_city_idx ON accommodations (city);

CREATE TRIGGER accommodations_updated_at
  BEFORE UPDATE ON accommodations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON accommodations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON accommodations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Seed data — all hotels booked for the trip
-- ============================================================

INSERT INTO accommodations (name, city, check_in_date, check_out_date, confirmation_numbers, booking_url, address, lat, lng, website) VALUES
(
  'Hotel Indigo Tokyo Shibuya',
  'tokyo',
  '2026-05-16',
  '2026-05-19',
  ARRAY['26447681', '43519539'],
  NULL,
  'Tokyo 150-0043, Japan',
  35.6484,
  139.7006,
  'https://www.ihg.com/hotelindigo/hotels/us/en/tokyo/tyosy/hoteldetail'
),
(
  'Yuen Bettei Daita',
  'tokyo',
  '2026-05-19',
  '2026-05-22',
  ARRAY['3352-6294-0330'],
  'https://go-udshotels.reservation.jp/en/mypage/reservations',
  NULL,
  35.6617,
  139.6694,
  NULL
),
(
  'Nazuna Hakone Miyanoshita',
  'hakone',
  '2026-05-22',
  '2026-05-24',
  ARRAY['LinTeni06c55JpNA'],
  'https://www.nazuna.co/property/nazuna-hakone-miyanoshita/',
  '250-0402 Hakone, Japan',
  35.2330,
  139.0616,
  'https://www.nazuna.co/property/nazuna-hakone-miyanoshita/'
),
(
  'Ace Hotel Kyoto',
  'kyoto',
  '2026-05-24',
  '2026-05-27',
  ARRAY['9146SG466337'],
  NULL,
  NULL,
  35.0130,
  135.7581,
  'https://acehotel.com/kyoto/'
),
(
  'Vacation House YOKOMBO',
  'naoshima',
  '2026-05-27',
  '2026-05-29',
  ARRAY['6592156983'],
  NULL,
  'Kagawa, Naoshima, 直島町３７５４－１０, Japan',
  34.4593,
  133.9876,
  NULL
),
(
  'Swissotel Nankai Osaka',
  'osaka',
  '2026-05-29',
  '2026-05-30',
  ARRAY['73404951955689'],
  NULL,
  '5-1-60 Namba Chuo-ku, Osaka, Osaka-fu, 542-0076 Japan',
  34.6687,
  135.5016,
  NULL
);
