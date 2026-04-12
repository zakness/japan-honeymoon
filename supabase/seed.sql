-- ============================================================
-- Seed data for development
-- ============================================================

INSERT INTO places (name, address, lat, lng, category, priority, status, city, notes) VALUES
  ('Ichiran Ramen Shinjuku', '3-34-11 Shinjuku, Shinjuku-ku, Tokyo', 35.6938, 139.7034, 'restaurant', 'must-do', 'researching', 'tokyo', 'Solo booth ramen experience. Get the rich tonkotsu.'),
  ('teamLab Borderless', '1-3-8 Aomi, Koto-ku, Tokyo', 35.6257, 139.7750, 'attraction', 'must-do', 'researching', 'tokyo', 'Book tickets in advance — sells out weeks ahead.'),
  ('Tsukiji Outer Market', '4-16-2 Tsukiji, Chuo-ku, Tokyo', 35.6654, 139.7707, 'attraction', 'want-to', 'researching', 'tokyo', 'Morning visit for fresh tamagoyaki and tuna onigiri.'),
  ('Kinkaku-ji', 'Kinkakujicho, Kita-ku, Kyoto', 35.0394, 139.7314, 'attraction', 'must-do', 'researching', 'kyoto', 'Golden Pavilion. Go early before crowds.'),
  ('Nishiki Market', 'Nishiki Market, Nakagyo-ku, Kyoto', 35.0052, 135.7657, 'shopping', 'want-to', 'researching', 'kyoto', 'Kyoto''s "kitchen" — great for food souvenirs and street snacks.');

INSERT INTO accommodations (name, city, check_in_date, check_out_date, address, lat, lng, booking_url, booked_by, check_in_time, check_out_time) VALUES
  ('Hotel Indigo Tokyo Shibuya', 'tokyo',    '2026-05-16', '2026-05-19', 'Tokyo 150-0043, Japan',                                                  35.6484, 139.7006, NULL,                                                            'Zak', '15:00', '11:00'),
  ('Yuen Bettei Daita',          'tokyo',    '2026-05-19', '2026-05-22', NULL,                                                                      35.6617, 139.6694, 'https://go-udshotels.reservation.jp/en/mypage/reservations', 'Zak', '15:00', '11:00'),
  ('Nazuna Hakone Miyanoshita',  'hakone',   '2026-05-22', '2026-05-24', '250-0402 Hakone, Japan',                                                  35.2330, 139.0616, 'https://www.nazuna.co/property/nazuna-hakone-miyanoshita/',  'Zak', '15:00', '11:00'),
  ('Ace Hotel Kyoto',            'kyoto',    '2026-05-24', '2026-05-27', NULL,                                                                      35.0130, 135.7581, NULL,                                                            'Mac', '15:00', '12:00'),
  ('Vacation House YOKOMBO',     'naoshima', '2026-05-27', '2026-05-29', 'Kagawa, Naoshima, 直島町３７５４－１０, Japan',                           34.4593, 133.9876, NULL,                                                            'Zak', '15:00', '10:00'),
  ('Swissotel Nankai Osaka',     'osaka',    '2026-05-29', '2026-05-30', '5-1-60 Namba Chuo-ku, Osaka, Osaka-fu, 542-0076 Japan',                  34.6687, 135.5016, NULL,                                                            'Mac', '15:00', '11:00');

INSERT INTO notes (title, body, sort_order) VALUES
  ('Packing list', E'- Pocket WiFi (reserved)\n- JR Pass (activate at airport)\n- Cash ¥50,000\n- Portable charger\n- Comfortable walking shoes', 0),
  ('Useful Japanese phrases', E'- Sumimasen (excuse me / sorry)\n- Arigatou gozaimasu (thank you)\n- Eigo wa hanasemasu ka? (do you speak English?)\n- Kore wa nan desu ka? (what is this?)\n- O-kaikei onegaishimasu (check please)', 1);
