-- 026: Stempelkarte zu Ende gedacht: Belohnung einloesen + Karte neu starten
--
-- Vorher: volle Karte = Sackgasse (jeder weitere Tap 409, reward_redeemed
-- wurde nie geschrieben, kein Reset). Jetzt: bei Abschluss bekommt die Karte
-- einen Belohnungs-Code (QR + 8 Zeichen), das Restaurant bestaetigt ihn,
-- der Abschluss wird in stamp_reward_claims protokolliert und dieselbe Zeile
-- startet bei 0 neu (8 Leser nutzen maybeSingle() auf user_id+restaurant_id,
-- eine zweite Zeile wuerde sie alle brechen).
--
-- Voraussetzung: 025 (gen_redeem_code).

ALTER TABLE stamp_cards
  ADD COLUMN IF NOT EXISTS reward_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS reward_redeemed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS stamp_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stamp_card_id uuid NOT NULL REFERENCES stamp_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  reward_text text,
  reward_code text NOT NULL,
  stamps_required integer NOT NULL,
  confirmed_by uuid REFERENCES profiles(id),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stamp_reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_or_owner_claims" ON stamp_reward_claims;
CREATE POLICY "read_own_or_owner_claims" ON stamp_reward_claims FOR SELECT USING (
  user_id = auth.uid()
  OR restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
);
CREATE INDEX IF NOT EXISTS idx_stamp_reward_claims_restaurant
  ON stamp_reward_claims(restaurant_id, confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_open_rewards
  ON stamp_cards(restaurant_id) WHERE is_completed AND NOT reward_redeemed;

-- Backfill: bereits volle Karten bekommen einen Code, damit bestehende
-- Gaeste ihre Belohnung abholen koennen.
UPDATE stamp_cards SET reward_code = gen_redeem_code()
  WHERE is_completed AND NOT reward_redeemed AND reward_code IS NULL;

-- Restaurant bestaetigt eine Stempel-Belohnung. Claim protokollieren, Karte
-- zuruecksetzen, Zielwert neu vom Restaurant uebernehmen.
CREATE OR REPLACE FUNCTION public.confirm_stamp_reward(p_code text, p_restaurant_id uuid, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c stamp_cards%ROWTYPE;
  r restaurants%ROWTYPE;
BEGIN
  SELECT * INTO c FROM stamp_cards WHERE reward_code = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'code_not_found'; END IF;
  IF c.restaurant_id <> p_restaurant_id THEN RAISE EXCEPTION 'wrong_restaurant'; END IF;
  IF NOT c.is_completed OR c.reward_redeemed THEN RAISE EXCEPTION 'already_used'; END IF;

  SELECT * INTO r FROM restaurants WHERE id = c.restaurant_id;

  INSERT INTO stamp_reward_claims
    (stamp_card_id, user_id, restaurant_id, reward_text, reward_code, stamps_required, confirmed_by)
  VALUES
    (c.id, c.user_id, c.restaurant_id, r.stamp_card_reward, c.reward_code, c.total_stamps_required, p_actor);

  UPDATE stamp_cards SET
    current_stamps = 0,
    is_completed = false,
    completed_at = NULL,
    reward_redeemed = false,
    reward_code = NULL,
    reward_redeemed_at = now(),
    completed_count = completed_count + 1,
    total_stamps_required = coalesce(r.stamp_card_total, total_stamps_required),
    updated_at = now()
  WHERE id = c.id;

  RETURN jsonb_build_object(
    'kind', 'stamp',
    'stamp_card_id', c.id,
    'user_id', c.user_id,
    'restaurant_id', c.restaurant_id,
    'reward', r.stamp_card_reward
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.confirm_stamp_reward(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_stamp_reward(text, uuid, uuid) TO service_role;
