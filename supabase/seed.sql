-- ============================================================
-- Seed data for development
-- ============================================================

INSERT INTO places (name, address, lat, lng, category, priority, status, city, notes) VALUES
  ('Ichiran Ramen Shinjuku', '3-34-11 Shinjuku, Shinjuku-ku, Tokyo', 35.6938, 139.7034, 'restaurant', 'must-do', 'researching', 'tokyo', 'Solo booth ramen experience. Get the rich tonkotsu.'),
  ('teamLab Borderless', '1-3-8 Aomi, Koto-ku, Tokyo', 35.6257, 139.7750, 'attraction', 'must-do', 'researching', 'tokyo', 'Book tickets in advance — sells out weeks ahead.'),
  ('Tsukiji Outer Market', '4-16-2 Tsukiji, Chuo-ku, Tokyo', 35.6654, 139.7707, 'attraction', 'want-to', 'researching', 'tokyo', 'Morning visit for fresh tamagoyaki and tuna onigiri.'),
  ('Kinkaku-ji', 'Kinkakujicho, Kita-ku, Kyoto', 35.0394, 139.7314, 'attraction', 'must-do', 'researching', 'kyoto', 'Golden Pavilion. Go early before crowds.'),
  ('Nishiki Market', 'Nishiki Market, Nakagyo-ku, Kyoto', 35.0052, 135.7657, 'shopping', 'want-to', 'researching', 'kyoto', 'Kyoto''s "kitchen" — great for food souvenirs and street snacks.');

INSERT INTO notes (title, body, sort_order) VALUES
  ('Packing list', E'- Pocket WiFi (reserved)\n- JR Pass (activate at airport)\n- Cash ¥50,000\n- Portable charger\n- Comfortable walking shoes', 0),
  ('Useful Japanese phrases', E'- Sumimasen (excuse me / sorry)\n- Arigatou gozaimasu (thank you)\n- Eigo wa hanasemasu ka? (do you speak English?)\n- Kore wa nan desu ka? (what is this?)\n- O-kaikei onegaishimasu (check please)', 1);
