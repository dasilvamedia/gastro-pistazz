-- 032: Nachrichten-Pipeline: Kampagnen, Kunden-Segmente pro Restaurant, Indizes
--
-- Vorher schrieb das Owner-Dashboard in notifications an ALLE profiles der
-- Plattform (ohne restaurant_id) und niemand las die Tabelle. Jetzt:
-- Empfaenger nur aus den eigenen Kunden (RPC), Kampagnen protokolliert,
-- Zustellung als In-App-Inbox + Push (lib/notifyUser.ts).
-- Voraussetzung: 030 (profiles.first_name).

CREATE TABLE IF NOT EXISTS notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,   -- NULL = plattformweit
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('restaurant', 'global')),
  segment text NOT NULL,
  title text NOT NULL,
  body text,
  url text,
  recipient_count integer NOT NULL DEFAULT 0,
  push_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_restaurant ON notification_campaigns(restaurant_id, created_at DESC);

ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_owner_read" ON notification_campaigns;
CREATE POLICY "campaigns_owner_read" ON notification_campaigns FOR SELECT USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
);

-- Indizes fuer Segmente und Inbox
CREATE INDEX IF NOT EXISTS idx_stamp_cards_restaurant_user ON stamp_cards(restaurant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_restaurant_user ON deal_redemptions(restaurant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_story_submissions_restaurant_status ON story_submissions(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant ON favorites(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_visits_restaurant_user ON visits(restaurant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Kunden eines Restaurants: jeder Gast mit Stempelkarte, Einloesung,
-- freigegebener Story, Favorit oder Besuch dort. Nur Inhaber, Admin oder
-- Server duerfen fragen.
CREATE OR REPLACE FUNCTION public.restaurant_customers(p_restaurant_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  first_name text,
  tier user_tier,
  last_activity_at timestamptz,
  current_stamps integer,
  stamps_total integer
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  WITH allowed AS (
    SELECT 1
    WHERE auth.role() = 'service_role'
       OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = p_restaurant_id AND r.owner_id = auth.uid())
       OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  ),
  src AS (
    SELECT user_id, updated_at AS ts FROM stamp_cards WHERE restaurant_id = p_restaurant_id
    UNION ALL SELECT user_id, redeemed_at FROM deal_redemptions WHERE restaurant_id = p_restaurant_id
    UNION ALL SELECT user_id, created_at FROM story_submissions WHERE restaurant_id = p_restaurant_id AND status = 'approved'
    UNION ALL SELECT user_id, created_at FROM favorites WHERE restaurant_id = p_restaurant_id
    UNION ALL SELECT user_id, visited_at FROM visits WHERE restaurant_id = p_restaurant_id
  )
  SELECT p.id, p.full_name, p.first_name, p.tier, max(s.ts), sc.current_stamps, sc.total_stamps_required
  FROM src s
  JOIN profiles p ON p.id = s.user_id AND p.role = 'guest'
  LEFT JOIN stamp_cards sc ON sc.user_id = p.id AND sc.restaurant_id = p_restaurant_id
  WHERE EXISTS (SELECT 1 FROM allowed)
  GROUP BY p.id, p.full_name, p.first_name, p.tier, sc.current_stamps, sc.total_stamps_required;
$$;
GRANT EXECUTE ON FUNCTION public.restaurant_customers(uuid) TO authenticated, service_role;

SELECT 'ok_032' AS result;
