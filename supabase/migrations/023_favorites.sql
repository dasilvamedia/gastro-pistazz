-- Favoriten: Gaeste swipen Restaurants (Tinder-Style) und merken sich
-- ihre Lieblinge. Rechts-Swipe = Favorit, Links-Swipe = uninteressant
-- (Dismissals bleiben nur lokal auf dem Geraet, nur Favoriten landen hier).

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_manage_own_favorites" ON favorites;
CREATE POLICY "user_manage_own_favorites" ON favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites (user_id);
