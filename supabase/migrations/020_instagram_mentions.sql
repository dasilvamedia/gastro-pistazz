-- Eingehende Instagram-Story-Erwaehnungen (story_mentions-Webhook der Meta-App).
-- Grundlage fuer die automatische Punkte-Vergabe ohne Link/Screenshot.
CREATE TABLE IF NOT EXISTS instagram_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_ig_id text NOT NULL,
  media_url text,
  mentioned_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb,
  status text NOT NULL DEFAULT 'received', -- received | matched | credited | other_event
  matched_user_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instagram_mentions ENABLE ROW LEVEL SECURITY;

-- Nur Admins duerfen lesen; geschrieben wird ausschliesslich per Service-Role
DROP POLICY IF EXISTS "admin_read_instagram_mentions" ON instagram_mentions;
CREATE POLICY "admin_read_instagram_mentions" ON instagram_mentions
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );
