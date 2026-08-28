-- NFC-Stempelkarte: physische NFC-Tags im Restaurant vergeben beim Antippen
-- automatisch einen Stempel. Tag-UID wird einmalig pro Restaurant registriert
-- (Admin-UI), danach reicht ein Tap in der App zum Stempeln - kein Foto/Standort
-- noetig, da nur wer physisch am Tag ist ihn ueberhaupt auslesen kann.

CREATE TABLE IF NOT EXISTS nfc_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tag_uid text NOT NULL UNIQUE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_own_nfc_tags" ON nfc_tags;
CREATE POLICY "owner_manage_own_nfc_tags" ON nfc_tags
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Protokoll jedes Taps (Betrugsschutz: 1 Stempel pro Nutzer/Restaurant/Tag-Cooldown)
CREATE TABLE IF NOT EXISTS nfc_stamp_taps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nfc_tag_id uuid NOT NULL REFERENCES nfc_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nfc_stamp_taps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_taps" ON nfc_stamp_taps;
CREATE POLICY "user_read_own_taps" ON nfc_stamp_taps
  FOR SELECT USING (
    user_id = auth.uid()
    OR restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_nfc_tags_restaurant ON nfc_tags(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_nfc_stamp_taps_user_restaurant ON nfc_stamp_taps(user_id, restaurant_id, created_at DESC);
