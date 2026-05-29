-- Seed: Singapore hawker centres, food courts, and kopitiams
-- Run this in Supabase SQL Editor to populate the eateries table
-- Coordinates sourced from public data / Google Maps verification

INSERT INTO eateries (name, type, address, latitude, longitude) VALUES

-- ── Hawker Centres ────────────────────────────────────────────────────────────
('Maxwell Food Centre',            'hawker_centre', '1 Kadayanallur St, Singapore 069184',              1.2803, 103.8454),
('Lau Pa Sat',                     'hawker_centre', '18 Raffles Quay, Singapore 048582',                1.2804, 103.8507),
('Newton Food Centre',             'hawker_centre', '500 Clemenceau Ave N, Singapore 229495',           1.3122, 103.8382),
('Chinatown Complex Food Centre',  'hawker_centre', '335 Smith St, Singapore 050335',                   1.2824, 103.8437),
('Old Airport Road Food Centre',   'hawker_centre', '51 Old Airport Rd, Singapore 390051',              1.3053, 103.8830),
('Tekka Centre',                   'hawker_centre', '665 Buffalo Rd, Singapore 210665',                 1.3065, 103.8510),
('Bedok Interchange Hawker Centre','hawker_centre', '208 New Upper Changi Rd, Singapore 460208',        1.3242, 103.9297),
('Adam Road Food Centre',          'hawker_centre', '2 Adam Rd, Singapore 289876',                      1.3255, 103.8081),
('Toa Payoh Lorong 8 Market',      'hawker_centre', '210 Lor 8 Toa Payoh, Singapore 310210',            1.3354, 103.8534),
('Geylang Serai Market',           'hawker_centre', '1 Geylang Serai, Singapore 402001',                1.3169, 103.9019),
('Bukit Timah Market',             'hawker_centre', '3 Cheong Chin Nam Rd, Singapore 599747',           1.3406, 103.7757),
('Tiong Bahru Market',             'hawker_centre', '30 Seng Poh Rd, Singapore 168898',                 1.2849, 103.8279),
('Amoy Street Food Centre',        'hawker_centre', '7 Maxwell Rd, Singapore 069111',                   1.2798, 103.8469),
('Hong Lim Food Centre',           'hawker_centre', '531A Upper Cross St, Singapore 051531',             1.2841, 103.8453),
('Changi Village Hawker Centre',   'hawker_centre', '2 Changi Village Rd, Singapore 500002',            1.3866, 103.9878),
('Chomp Chomp Food Centre',        'hawker_centre', '20 Kensington Park Rd, Singapore 557269',          1.3685, 103.8699),
('Whampoa Makan Place',            'hawker_centre', '90 Whampoa Dr, Singapore 320090',                  1.3228, 103.8568),
('Zion Riverside Food Centre',     'hawker_centre', '70 Zion Rd, Singapore 247792',                     1.2889, 103.8229),
('Empress Road Market',            'hawker_centre', '7A Commonwealth Lane, Singapore 149544',            1.3082, 103.8030),
('Clementi Market',                'hawker_centre', '448 Clementi Ave 3, Singapore 120448',              1.3148, 103.7643),
('Boon Lay Place Market',          'hawker_centre', '221B Boon Lay Pl, Singapore 642221',               1.3444, 103.7082),
('Jurong West 505 Hawker Centre',  'hawker_centre', '505 Jurong West St 52, Singapore 640505',          1.3475, 103.7113),
('Tampines Round Market',          'hawker_centre', '137 Tampines St 11, Singapore 521137',              1.3540, 103.9421),
('Yishun Park Hawker Centre',      'hawker_centre', '51 Yishun Ave 11, Singapore 768867',               1.4271, 103.8350),
('Serangoon Garden Market',        'hawker_centre', '49A Serangoon Garden Way, Singapore 555945',        1.3634, 103.8660),

-- ── Food Courts ───────────────────────────────────────────────────────────────
('Food Republic VivoCity',         'food_court',    '1 HarbourFront Walk, Singapore 098585',             1.2644, 103.8222),
('Food Republic ION Orchard',      'food_court',    '2 Orchard Turn, Singapore 238801',                  1.3039, 103.8318),
('Food Opera ION Orchard',         'food_court',    '2 Orchard Turn B4, Singapore 238801',               1.3039, 103.8318),
('Kopitiam Bugis Junction',        'food_court',    '200 Victoria St, Singapore 188021',                 1.2995, 103.8551),
('Koufu Jurong Point',             'food_court',    '1 Jurong West Central 2, Singapore 648886',         1.3402, 103.7063),
('Food Junction Tampines Mall',    'food_court',    '4 Tampines Central 5, Singapore 529510',            1.3527, 103.9455),

-- ── Kopitiams (stored as cafe — closest allowed type) ────────────────────────
('Ya Kun Kaya Toast Tanjong Pagar','cafe',           '18 China St, Singapore 049560',                     1.2801, 103.8459),
('Killiney Kopitiam Killiney Rd',  'cafe',           '67 Killiney Rd, Singapore 239525',                  1.2975, 103.8361),
('Toast Box Raffles City',         'cafe',           '252 North Bridge Rd, Singapore 179103',              1.2938, 103.8532),
('Heap Seng Leong Kopitiam',       'cafe',           '10 North Bridge Rd, Singapore 190010',               1.2907, 103.8519),

-- ── Cafes ─────────────────────────────────────────────────────────────────────
('Symmetry Cafe',                  'cafe',          '9 Jalan Kubor, Singapore 199206',                   1.3025, 103.8605),
('Common Man Coffee Roasters',     'cafe',          '22 Martin Rd, Singapore 239058',                    1.2893, 103.8344),
('Afterwit Coffee',                'cafe',          '100 Tras St, Singapore 079027',                     1.2779, 103.8436),
('Tiong Hoe Specialty Coffee',     'cafe',          '34B Jalan Tiga, Singapore 390034',                  1.2854, 103.8258),

-- ── Restaurants ───────────────────────────────────────────────────────────────
('Din Tai Fung Paragon',           'restaurant',    '290 Orchard Rd, Singapore 238859',                  1.3012, 103.8351),
('Jumbo Seafood Robertson Quay',   'restaurant',    '30 Robertson Quay, Singapore 238251',               1.2895, 103.8373),
('Imperial Treasure Super Peking Duck', 'restaurant', '9 Scotts Rd, Singapore 228210',                  1.3043, 103.8344),
('Paradise Dynasty Ion',           'restaurant',    '2 Orchard Turn, Singapore 238801',                  1.3039, 103.8318),
('Violet Oon Satay Bar',           'restaurant',    '1 St Andrew Rd, Singapore 178957',                  1.2892, 103.8506);
