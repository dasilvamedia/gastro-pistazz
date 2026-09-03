-- 031: Geraete-Tokens fuer natives Push (APNs, spaeter FCM)
--
-- Web-Push (push_subscriptions) funktioniert in der iOS-WebView nicht.
-- Die App registriert sich nativ und legt hier ihr Token ab; der Server
-- sendet ueber APNs (lib/push/server.ts). Ungueltige Tokens werden beim
-- Senden geloescht (BadDeviceToken / Unregistered).

CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_device_tokens" ON device_tokens;
CREATE POLICY "own_device_tokens" ON device_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

SELECT 'ok_031' AS result;
