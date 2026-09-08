-- 035: Kassenbon-Fenster (5 h) + NFC-Bestaetigung fuer Story-Einreichungen
--
-- nfc_confirmed_at: Der Gast hat die Pistazz-NFC-Karte des Restaurants
--   angetippt (physischer Anwesenheitsbeweis). Ersetzt den Kassenbon als
--   Fallback, wenn er vergessen wurde ("beim naechsten Besuch bestaetigen").
-- proof_reminder_stage: 0 = keine Erinnerung, 1 = "Kassenbon hochladen"
--   verschickt (~1 h), 2 = "Fenster vorbei, NFC-Fallback" verschickt (5 h).
-- Partieller Index: der Cron scannt nur offene Story-Einreichungen ohne
--   Kassenbon - bleibt auch bei Millionen Zeilen winzig.

ALTER TABLE story_submissions ADD COLUMN IF NOT EXISTS nfc_confirmed_at timestamptz;
ALTER TABLE story_submissions ADD COLUMN IF NOT EXISTS proof_reminder_stage integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_story_pending_receipt
  ON story_submissions (created_at)
  WHERE status = 'pending' AND type = 'instagram_story' AND receipt_url IS NULL;
