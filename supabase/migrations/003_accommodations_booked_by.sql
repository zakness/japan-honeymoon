ALTER TABLE accommodations ADD COLUMN booked_by TEXT;

UPDATE accommodations SET booked_by = 'Mac' WHERE name IN ('Ace Hotel Kyoto', 'Swissotel Nankai Osaka');
UPDATE accommodations SET booked_by = 'Zak' WHERE name IN ('Hotel Indigo Tokyo Shibuya', 'Yuen Bettei Daita', 'Nazuna Hakone Miyanoshita', 'Vacation House YOKOMBO');
