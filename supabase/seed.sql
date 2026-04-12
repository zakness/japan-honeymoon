-- ============================================================
-- Seed data for development
-- ============================================================

INSERT INTO places (name, lat, lng, category, priority, status, city, notes) VALUES
  -- Tokyo (including Saitama day-trip destinations)
  ('Akihabara',                          35.699647,  139.771370, 'shopping',    'want-to', 'researching', 'tokyo', 'Nerd shopping district.'),
  ('Ghibli Museum',                      35.696238,  139.570432, 'attraction',  'must-do', 'researching', 'tokyo', 'Tickets go on sale on the 10th for the following month.'),
  ('Golden Gai',                         35.694112,  139.704761, 'cafe_bar',    'must-do', 'researching', 'tokyo', 'Over 200 small bars and restaurants in a historic area famous for intimate and diverse drinking and dining experiences.'),
  ('Gotokuji Temple',                    35.648812,  139.647481, 'attraction',  'want-to', 'researching', 'tokyo', 'Known for its charming maneki-neko (beckoning cat) figurines believed to bring good luck and fortune.'),
  ('Hanazono Jinja',                     35.693531,  139.705328, 'attraction',  'want-to', 'researching', 'tokyo', 'Dedicated to Inari, the god of fertility and worldly success.'),
  ('Kanda Temple',                       35.695438,  139.767555, 'attraction',  'want-to', 'researching', 'tokyo', 'Been around for almost 1,300 years!'),
  ('Kashiya Yokocho',                    35.925060,  139.481051, 'shopping',    'want-to', 'researching', 'tokyo', 'Lined by stores selling traditional Japanese sweets and cakes. (Kawagoe, Saitama)'),
  ('Koffee Mameya Kakeru',               35.676474,  139.804184, 'cafe_bar',    'want-to', 'researching', 'tokyo', 'Coffee omakase experience.'),
  ('Kusatsu Onsen',                      36.622965,  138.596723, 'nature_park', 'want-to', 'researching', 'tokyo', '2 hours outside Tokyo.'),
  ('Meiji Jingu Shrine & Gyoen Gardens', 35.673961,  139.700485, 'attraction',  'want-to', 'researching', 'tokyo', 'Serene Shinto shrine in a forested area, a peaceful escape from the city''s hustle and bustle.'),
  ('Musashi Ichinomiya Hikawa Shrine',   35.915115,  139.630419, 'attraction',  'want-to', 'researching', 'tokyo', 'Said to have the largest wooden torii gate in Japan. Try the ''hitogata nagashi'' ritual at the small river through the shrine grounds. (Saitama)'),
  ('Omiya Bonsai Art Museum',            35.928834,  139.632712, 'attraction',  'want-to', 'researching', 'tokyo', 'World''s first public museum solely devoted to the traditional Japanese art of bonsai. (Saitama)'),
  ('Omotesando',                         35.667355,  139.707743, 'shopping',    'want-to', 'researching', 'tokyo', 'Upscale shopping avenue lined with trendy boutiques and cafes.'),
  ('Sensoji Temple',                     35.714765,  139.796655, 'attraction',  'want-to', 'researching', 'tokyo', 'Tokyo''s oldest Buddhist temple, featuring the iconic Kaminarimon Gate and a vibrant Nakamise-dori shopping street.'),
  ('Shibuya Crossing',                   35.659482,  139.700560, 'attraction',  'want-to', 'researching', 'tokyo', 'One of the world''s busiest pedestrian crossings.'),
  ('Small Worlds Tokyo',                 35.637923,  139.788356, 'shopping',    'must-do', 'researching', 'tokyo', NULL),
  ('Square Enix Garden (Store)',         35.657255,  139.701621, 'shopping',    'want-to', 'researching', 'tokyo', 'Square Enix official store in Shibuya.'),
  ('Takeshita Street',                   35.671034,  139.705182, 'shopping',    'want-to', 'researching', 'tokyo', 'Famous for quirky vintage clothing and cosplay shops. Surrounding lanes have bars and dessert shops with crêpes, bubble tea, and mochi.'),
  ('TeamLab Borderless',                 35.676423,  139.650027, 'attraction',  'want-to', 'researching', 'tokyo', 'Rec by Cindy Juarez. Immersive digital art museum combining cutting-edge technology with interactive art installations.'),
  ('The Railway Museum',                 35.921425,  139.617920, 'attraction',  'want-to', 'researching', 'tokyo', 'Recounts the history of railway in Japan with many previously used train cars. (Saitama)'),
  ('Toei Animation Museum',             35.752398,  139.594448, 'attraction',  'want-to', 'researching', 'tokyo', NULL),
  ('Toki no Kane (Bell Tower)',          35.923476,  139.483335, 'attraction',  'want-to', 'researching', 'tokyo', NULL),
  -- Kyoto (including Uji day-trip destinations)
  ('Adashino Nenbutsu-ji',              35.026960,  135.665613, 'attraction',  'want-to', 'researching', 'kyoto', 'About 8,000 stone images and pagodas commemorating the souls of those who died without kin.'),
  ('Akoya Jaya Pickles',                34.998035,  135.780865, 'restaurant',  'want-to', 'researching', 'kyoto', NULL),
  ('Arashiyama Bamboo Forest',          35.016819,  135.671301, 'nature_park', 'want-to', 'researching', 'kyoto', 'Mesmerizing natural wonder known for its towering bamboo stalks and serene atmosphere.'),
  ('Arashiyama Monkey Park',            35.011395,  135.676625, 'nature_park', 'want-to', 'researching', 'kyoto', 'Japanese macaques (snow monkeys) that roam freely within a designated area.'),
  ('Beatle Momo',                       35.005550,  135.770675, 'cafe_bar',    'want-to', 'researching', 'kyoto', 'Vinyl listening bar.'),
  ('Byodo-In Temple',                   34.889291,  135.807678, 'attraction',  'want-to', 'researching', 'kyoto', 'Striking example of Buddhist Pure Land (Jodo) architecture. Located in Uji.'),
  ('Fushimi Inari',                     34.967695,  135.779188, 'attraction',  'want-to', 'researching', 'kyoto', 'Iconic pathway lined with thousands of vibrant red torii gates.'),
  ('Gion',                              34.998547,  135.773743, 'attraction',  'want-to', 'researching', 'kyoto', 'Kyoto''s most famous geisha district.'),
  ('Kenninji Temple',                   35.000036,  135.773563, 'attraction',  'want-to', 'researching', 'kyoto', 'Ceiling covered in an ink painting of two giant dragons with gorgeous interior gardens.'),
  ('Kinkakuji Temple',                  35.039370,  135.729243, 'attraction',  'want-to', 'researching', 'kyoto', 'The Temple of the Golden Pavilion.'),
  ('Kiyomizudera Temple',               34.994666,  135.784661, 'attraction',  'want-to', 'researching', 'kyoto', 'One of the most celebrated temples of Japan.'),
  ('Kodaiji Temple',                    35.000769,  135.781272, 'attraction',  'want-to', 'researching', 'kyoto', NULL),
  ('Komyo-In',                          34.973954,  135.773670, 'attraction',  'want-to', 'researching', 'kyoto', 'Hidden gem best known for its karesansui (dry landscape garden).'),
  ('Koshoji Temple',                    34.890027,  135.813694, 'attraction',  'want-to', 'researching', 'kyoto', 'Located in Uji.'),
  ('Nishiki Tenmangu',                  35.012031,  135.679509, 'attraction',  'want-to', 'researching', 'kyoto', 'People pray to Michizane''s spirit for luck in learning.'),
  ('Otagi Nenbutsu-ji',                 35.031143,  135.661555, 'attraction',  'want-to', 'researching', 'kyoto', 'Buddhist temple with over 1,200 whimsical stone statues of rakan.'),
  ('Samurai Museum',                    35.007217,  135.763567, 'attraction',  'want-to', 'researching', 'kyoto', NULL),
  ('Torikiku',                          34.890112,  135.806316, 'restaurant',  'want-to', 'researching', 'kyoto', 'Matcha soba restaurant in Uji.'),
  ('Tsuen Tea House',                   34.893290,  135.807276, 'cafe_bar',    'want-to', 'researching', 'kyoto', 'Oldest tea house in the world. Located in Uji.'),
  ('Uji Bridge',                        34.892946,  135.806240, 'attraction',  'want-to', 'researching', 'kyoto', 'A link to great stories of Japan''s past, both historical and fictional.'),
  ('Yasaka Pagoda',                     34.998558,  135.779236, 'attraction',  'want-to', 'researching', 'kyoto', 'Majestic five-story pagoda.'),
  -- Osaka
  ('Dotonburi',                         34.668647,  135.503098, 'restaurant',  'want-to', 'researching', 'osaka', 'Iconic district with vibrant neon lights, street food stalls, and a lively atmosphere.'),
  ('Kuromon Market',                    34.664612,  135.506982, 'restaurant',  'want-to', 'researching', 'osaka', 'About 150 shops selling fish, meat, produce, traditional sweets, and homeware.'),
  ('Namba Yasaka Shrine',               34.661559,  135.496704, 'attraction',  'want-to', 'researching', 'osaka', 'Famous for its towering lion head-shaped stage.'),
  ('Osaka Castle',                      34.687257,  135.525855, 'attraction',  'want-to', 'researching', 'osaka', NULL),
  ('Shinsekai',                         34.652248,  135.507078, 'restaurant',  'want-to', 'researching', 'osaka', 'Kushikatsu Daruma is the most famous spot, or try Kushikatsu Baikingu Daitoryo for a DIY fry-your-own-skewers experience.'),
  ('Shitennoji Temple',                 34.654458,  135.516524, 'attraction',  'want-to', 'researching', 'osaka', 'One of Japan''s oldest temples and the first ever to be built by the state.'),
  ('Sumiyoshi Temple',                  34.665361,  135.512732, 'attraction',  'want-to', 'researching', 'osaka', 'Unique Sumiyoshi-zukuri shrine architecture, free of influence from the Asian mainland.');

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
