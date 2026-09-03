-- 024: Integritaet der Punkte-Oekonomie
--
-- Befund: Die Policy "Users can update own profile" hat keinen Spaltenschutz.
-- Jeder eingeloggte Gast konnte per Browser-Konsole seine eigenen
-- available_points setzen. Ausserdem durften Gaeste deal_redemptions und
-- stamp_cards direkt einfuegen (kostenlose Codes ohne Punkteabzug).
--
-- Alle Aenderungen sind idempotent und rueckwaertskompatibel. Server-Routen
-- schreiben ueber den Service-Role-Client und bleiben unberuehrt.

-- 1) Gaeste duerfen ihr Profil bearbeiten, aber niemals die Oekonomie-Spalten.
--    auth.role() ist 'authenticated' fuer Browser-Sessions und 'service_role'
--    fuer den Admin-Client. Der Trigger setzt die Spalten still auf den alten
--    Wert zurueck, damit legitime Profil-Updates (Name, Stadt) nicht brechen.
CREATE OR REPLACE FUNCTION public.protect_profile_economy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
    NEW.total_points     := OLD.total_points;
    NEW.available_points := OLD.available_points;
    NEW.total_visits     := OLD.total_visits;
    NEW.total_stories    := OLD.total_stories;
    NEW.tier             := OLD.tier;
    NEW.role             := OLD.role;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_economy ON profiles;
CREATE TRIGGER trg_protect_profile_economy
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_economy();

-- 2) Guthaben kann nie negativ werden (bestehende Ausreisser vorher bereinigen).
UPDATE profiles SET available_points = 0 WHERE available_points < 0;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_available_points_nonneg;
ALTER TABLE profiles ADD CONSTRAINT profiles_available_points_nonneg
  CHECK (available_points >= 0);

-- 3) Einloesungen und Stempel entstehen nur noch serverseitig
--    (API-Routen mit Service-Role, ab 025 per RPC in einer Transaktion).
DROP POLICY IF EXISTS "Users can create redemptions" ON deal_redemptions;
DROP POLICY IF EXISTS "Users can update own stamp cards" ON stamp_cards;

-- 4) Dieselbe Story darf nicht mehrfach eingereicht werden.
--    Vorher pruefen, ob Duplikate existieren (muessen manuell entschieden werden):
--    SELECT lower(instagram_permalink), count(*) FROM story_submissions
--     WHERE instagram_permalink IS NOT NULL AND status <> 'rejected'
--     GROUP BY 1 HAVING count(*) > 1;
--    Teilindex ohne 'rejected', damit ein Gast nach Ablehnung neu einreichen kann.
CREATE UNIQUE INDEX IF NOT EXISTS uq_story_submissions_permalink
  ON story_submissions (lower(instagram_permalink))
  WHERE instagram_permalink IS NOT NULL AND status <> 'rejected';

-- 5) Super-Admin darf plattformweit lesen (Story-Pruefung, Einloesungen,
--    Stempelkarten, Punkte-Historie). Muster wie "super_admin_restaurants" (002).
--    Schreiben laeuft weiterhin ueber die API mit Service-Role.
DROP POLICY IF EXISTS "super_admin_story_submissions" ON story_submissions;
CREATE POLICY "super_admin_story_submissions" ON story_submissions
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "super_admin_deal_redemptions" ON deal_redemptions;
CREATE POLICY "super_admin_deal_redemptions" ON deal_redemptions
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "super_admin_stamp_cards" ON stamp_cards;
CREATE POLICY "super_admin_stamp_cards" ON stamp_cards
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "super_admin_points_transactions" ON points_transactions;
CREATE POLICY "super_admin_points_transactions" ON points_transactions
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

-- 6) Realtime fuer Bestaetigungs-Screens (Gast wartet, bis das Restaurant
--    den Code bestaetigt). Fehler ignorieren, falls schon enthalten.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE deal_redemptions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE stamp_cards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
