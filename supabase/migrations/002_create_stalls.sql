-- Individual stalls within hawker centres
CREATE TABLE stalls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eatery_id    UUID NOT NULL REFERENCES eateries(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  stall_number TEXT,
  food_type    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Maxwell Food Centre stalls
INSERT INTO stalls (eatery_id, name, stall_number, food_type) 
SELECT e.id, s.name, s.num, s.food
FROM eateries e
CROSS JOIN (VALUES
  ('Tian Tian Hainanese Chicken Rice', '#01-10', 'Chicken Rice'),
  ('Maxwell Fuzhou Oyster Cake',        '#01-06', 'Oyster Cake'),
  ('Rojak, Popiah & Cockles',           '#01-19', 'Rojak'),
  ('China Street Fritters',             '#01-47', 'Fritters')
) AS s(name, num, food)
WHERE e.name = 'Maxwell Food Centre';
