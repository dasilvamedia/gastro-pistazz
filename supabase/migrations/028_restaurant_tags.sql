-- 028: Tags fuer Restaurants (Kueche + Ernaehrung) und Index fuer die Umkreissuche
--
-- Zwei Spalten statt einer: Kueche wird ODER-gefiltert ("italienisch oder
-- tuerkisch"), Ernaehrung UND-gefiltert ("vegan und glutenfrei"). Werte sind
-- ASCII-Slugs, die Whitelist liegt im Code (lib/restaurantTags.ts).
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cuisine text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants USING GIN (cuisine);
CREATE INDEX IF NOT EXISTS idx_restaurants_dietary ON restaurants USING GIN (dietary);

-- Bounding-Box-Vorfilter fuer "In meiner Naehe"
CREATE INDEX IF NOT EXISTS idx_restaurants_active_latlng
  ON restaurants (latitude, longitude) WHERE is_active = true;

SELECT 'ok_028' AS result,
       (SELECT count(*) FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name IN ('cuisine', 'dietary')) AS tag_columns;
