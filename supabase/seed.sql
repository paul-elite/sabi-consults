-- =====================================================================
--  Sample listings (from the current sabiconsults website)
--  Optional. Run after setup.sql. Skips any title that already exists,
--  so it is safe to run more than once. Edit or delete them in /admin.
-- =====================================================================
INSERT INTO properties (title, description, price, price_label, type, district, address, latitude, longitude, bedrooms, bathrooms, land_size, images, features, variations, status, featured)
SELECT * FROM (VALUES
  ('Emerald Grove City',
   'Emerald Grove City is situated in Asokoro II, one of Abuja’s most serene and secure zones, close to central Abuja and the major diplomatic areas. Plots are available outright or on 3 and 6 month payment plans.',
   9000000::bigint, 'From, per plot', 'land', 'Asokoro', 'Asokoro II, FCT-Abuja', 9.0305, 7.5402, NULL::int, NULL::int, 250,
   ARRAY['https://framerusercontent.com/images/YogyFe5cKsjtPU9xer3JHgCkxg.jpg','https://framerusercontent.com/images/GSA8cCcxXHEFdIJvsBIxIsXgrGc.jpg','https://framerusercontent.com/images/u1pAci3d4HY9uqIixHDzbREaY88.jpg','https://framerusercontent.com/images/FnmHBHk8baHqPkSsOAuqQ750I.jpg','https://framerusercontent.com/images/Akk0lXtygC7bUubgJHE1FQ9WQ.jpg','https://framerusercontent.com/images/up3tFvGAITthJCYIyt84eLEMM.jpg'],
   ARRAY['Paved road network','Gated access','Perimeter fencing','Central water supply','Drainage system'],
   '[{"id":"egc-regal","name":"Regal (1000 sqm)","price":35000000,"landSize":1000,"status":"available"},
     {"id":"egc-prestige","name":"Prestige (600 sqm)","price":25000000,"landSize":600,"status":"available"},
     {"id":"egc-prime","name":"Prime (400 sqm)","price":16000000,"landSize":400,"status":"available"},
     {"id":"egc-smart","name":"Smart (300 sqm)","price":12000000,"landSize":300,"status":"available"},
     {"id":"egc-haven","name":"Haven (250 sqm)","price":9000000,"landSize":250,"status":"available"}]'::jsonb,
   'available', true),
  ('Solace Apartments',
   'In Kubwa, one of Abuja’s most connected and fast-growing residential hubs, Solace Apartments offer practical floor plans in a family-friendly estate close to everyday conveniences. A 2 bedroom apartment is ₦55m outright, ₦60m over 3 months, ₦65m over 6 months or ₦70m over 12 months.',
   55000000::bigint, 'Outright', 'house', 'Kubwa', 'Kubwa, FCT-Abuja', 9.1555, 7.3225, 2, 2, NULL::int,
   ARRAY['https://framerusercontent.com/images/AuaSznchC4hZ7SiZ0S3YQ4WWSy0.jpg','https://framerusercontent.com/images/JslY2WD1lgf8B4dYUPeNz7Zqvo.jpg','https://framerusercontent.com/images/L8rk7ZowCGPp7Nsp8jyySV0B4c.jpg','https://framerusercontent.com/images/MjuVpwKvNwOIsz1rurPrFqMkk.jpg'],
   ARRAY['Paved road network','Gated access','Perimeter fencing','Central water supply','Drainage system'],
   '[{"id":"sol-2bed","name":"2 Bedroom Apartment","price":55000000,"bedrooms":2,"bathrooms":2,"status":"available"},
     {"id":"sol-3bed","name":"3 Bedroom Terrace","bedrooms":3,"bathrooms":3,"bq":1,"status":"available"}]'::jsonb,
   'available', true),
  ('Galadima Plots',
   'An investment opportunity in Galadima, just opposite Sun City Estate: a 600 sqm plot at an affordable price.',
   38000000::bigint, 'Per plot', 'land', 'Galadima', 'Galadima, opposite Sun City Estate, FCT-Abuja', 9.0472, 7.4398, NULL::int, NULL::int, 600,
   ARRAY['https://framerusercontent.com/images/c8GW8Swst4NGIK4WAJEYBVZYJTA.png'],
   ARRAY['Government-approved title'],
   '[]'::jsonb, 'available', false),
  ('Beverly Court',
   'An opportunity to own an exclusive home unit behind Market Square, Jikwoyi Phase 1. 21 units on 400 sqm plots.',
   0::bigint, 'Price on request', 'land', 'Jikwoyi', 'Behind Market Square, Jikwoyi Phase 1, FCT-Abuja', 8.9893, 7.5741, NULL::int, NULL::int, 400,
   ARRAY['https://framerusercontent.com/images/c8GW8Swst4NGIK4WAJEYBVZYJTA.png'],
   ARRAY['21 units','Gated access'],
   '[{"id":"bev-400","name":"400 sqm plot","landSize":400,"unitsAvailable":21,"status":"available"}]'::jsonb,
   'available', true),
  ('Joharee Residence',
   'Plots in Guzape II, a fast-rising district minutes from the Central Business District.',
   0::bigint, 'Price on request', 'land', 'Guzape', 'Guzape II, FCT-Abuja', 9.0168, 7.5095, NULL::int, NULL::int, NULL::int,
   ARRAY['https://framerusercontent.com/images/c1Us14khJ2Pbnk9khy6JjvemQ2I.jpg'],
   ARRAY['Paved road network','Gated access'],
   '[]'::jsonb, 'available', false),
  ('Moonstone Haven',
   'Affordable plots in Lugbe with quick access to the airport road and the city centre.',
   0::bigint, 'Price on request', 'land', 'Lugbe', 'Lugbe, FCT-Abuja', 8.9770, 7.3712, NULL::int, NULL::int, NULL::int,
   ARRAY['https://framerusercontent.com/images/ZSNXaQz4hdfzdIVipWT8tfjcyGo.png'],
   ARRAY['Perimeter fencing','Drainage system'],
   '[]'::jsonb, 'available', false)
) AS v(title, description, price, price_label, type, district, address, latitude, longitude, bedrooms, bathrooms, land_size, images, features, variations, status, featured)
WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.title = v.title);

-- Team (from the current website). Add photos in /admin/team.
INSERT INTO team_members (name, role, display_order)
SELECT * FROM (VALUES
  ('Oche E. Paul', 'CEO', 1),
  ('Otonbong Udia', 'COO', 2),
  ('Omeneke J. Ohikere', 'Investment Advisor', 3),
  ('David E. Amos', 'Investment Advisor', 4),
  ('Glory E. Idoko', 'Investment Advisor', 5),
  ('Aisha Abdullahi', 'Investment Advisor', 6),
  ('Hadiza Abdullahi', 'Legal Secretary / CSR', 7)
) AS t(name, role, display_order)
WHERE NOT EXISTS (SELECT 1 FROM team_members m WHERE m.name = t.name);
