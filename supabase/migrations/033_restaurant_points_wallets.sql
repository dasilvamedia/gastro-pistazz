-- 033: Punkte pro Restaurant (Wallets) + Schalter "fremde Punkte akzeptieren"
--
-- Bisher: EIN globaler Topf (profiles.available_points). Jeder konnte ueberall
-- verdiente Punkte ueberall einloesen. Wunsch: Ein Restaurant soll einstellen
-- koennen, ob Gaeste hier NUR bei ihm gesammelte Punkte einloesen duerfen
-- (accept_foreign_points = false) oder ihr ganzes Guthaben (true, Standard,
-- entspricht dem bisherigen Verhalten).
--
-- Dafuer brauchen wir echte Guthaben je (Gast, Restaurant): guest_points.
-- profiles.available_points bleibt der Gesamtstand (= Summe aller Wallets) und
-- wird weiter fuer die Anzeige genutzt. Einloesen zieht aus den Wallets:
--   - restriktives Restaurant: nur aus dem eigenen Wallet
--   - offenes Restaurant: eigenes Wallet zuerst, dann die anderen (groesste zuerst)
-- Die Aufteilung steht als points_breakdown in der Einloesung, damit ein
-- Refund bei Ablauf exakt in dieselben Wallets zurueckbucht.
--
-- Voraussetzung: 025 (redeem/expire), 027b (award_story_points). Ungefaehrlich
-- live auszufuehren: Default true = kein Verhaltenswechsel fuer Bestandsdaten.

-- 1) Schalter pro Restaurant
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS accept_foreign_points boolean NOT NULL DEFAULT true;

-- 2) Wallet je (Gast, Restaurant)
CREATE TABLE IF NOT EXISTS guest_points (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restaurant_id)
);
ALTER TABLE guest_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_guest_points" ON guest_points;
CREATE POLICY "read_own_guest_points" ON guest_points FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "super_admin_guest_points" ON guest_points;
CREATE POLICY "super_admin_guest_points" ON guest_points FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
CREATE INDEX IF NOT EXISTS idx_guest_points_restaurant ON guest_points(restaurant_id);

-- 3) Aufteilung der ausgegebenen Punkte je Einloesung (fuer exakten Refund)
ALTER TABLE deal_redemptions ADD COLUMN IF NOT EXISTS points_breakdown jsonb;

-- 4) Backfill: Wallets aus der Transaktions-Historie, Gesamtstand angleichen
INSERT INTO guest_points (user_id, restaurant_id, balance)
SELECT user_id, restaurant_id, GREATEST(0, SUM(amount))::int
FROM points_transactions
WHERE restaurant_id IS NOT NULL
GROUP BY user_id, restaurant_id
ON CONFLICT (user_id, restaurant_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();

UPDATE profiles p
SET available_points = COALESCE((SELECT SUM(balance) FROM guest_points g WHERE g.user_id = p.id), 0);

-- 5) Punkte-Vergabe: zusaetzlich das Wallet des vergebenden Restaurants fuellen
CREATE OR REPLACE FUNCTION public.award_story_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  points_to_award INTEGER;
  restaurant RECORD;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND coalesce(NEW.points_awarded, 0) = 0 THEN
    SELECT * INTO restaurant FROM restaurants WHERE id = NEW.restaurant_id;

    CASE NEW.type
      WHEN 'instagram_story' THEN points_to_award := restaurant.points_per_story;
      WHEN 'instagram_reel' THEN points_to_award := restaurant.points_per_reel;
      WHEN 'instagram_post' THEN points_to_award := restaurant.points_per_post;
      WHEN 'google_review' THEN points_to_award := restaurant.points_per_google_review;
      WHEN 'receipt' THEN points_to_award := restaurant.points_per_receipt;
      ELSE points_to_award := 100;
    END CASE;
    points_to_award := coalesce(points_to_award, 100);

    UPDATE profiles
    SET total_points = total_points + points_to_award,
        available_points = available_points + points_to_award,
        total_stories = total_stories + 1,
        total_visits = total_visits + 1
    WHERE id = NEW.user_id;

    -- Wallet des Restaurants, bei dem die Punkte verdient wurden
    INSERT INTO guest_points (user_id, restaurant_id, balance)
    VALUES (NEW.user_id, NEW.restaurant_id, points_to_award)
    ON CONFLICT (user_id, restaurant_id) DO UPDATE
      SET balance = guest_points.balance + points_to_award, updated_at = now();

    INSERT INTO points_transactions (user_id, restaurant_id, type, amount, balance_after, reference_type, reference_id, description)
    SELECT NEW.user_id, NEW.restaurant_id, 'earned', points_to_award, available_points, 'story_submission', NEW.id,
           'Punkte fuer ' || NEW.type
    FROM profiles WHERE id = NEW.user_id;

    INSERT INTO visits (user_id, restaurant_id, source, receipt_url)
    VALUES (NEW.user_id, NEW.restaurant_id,
            CASE WHEN NEW.type = 'receipt' THEN 'receipt'::visit_source ELSE 'story'::visit_source END,
            NEW.receipt_url)
    ON CONFLICT (user_id, restaurant_id) DO NOTHING;

    UPDATE story_submissions SET points_awarded = points_to_award, verified_at = coalesce(verified_at, NOW()) WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 6) Ablauf/Refund: Punkte exakt in die urspruenglichen Wallets zurueckbuchen
CREATE OR REPLACE FUNCTION public.expire_deal_redemptions(p_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  n integer := 0;
  new_balance integer;
  bd jsonb;
  k text;
  v integer;
BEGIN
  FOR r IN
    SELECT dr.id, dr.user_id, dr.deal_id, dr.restaurant_id, dr.points_spent, dr.points_breakdown, d.title
    FROM deal_redemptions dr JOIN deals d ON d.id = dr.deal_id
    WHERE dr.status = 'pending' AND dr.expires_at < now()
      AND (p_user_id IS NULL OR dr.user_id = p_user_id)
    FOR UPDATE OF dr SKIP LOCKED
  LOOP
    UPDATE deal_redemptions SET status = 'expired', refunded_at = now() WHERE id = r.id;
    UPDATE deals SET total_redemptions = greatest(total_redemptions - 1, 0) WHERE id = r.deal_id;

    IF r.points_spent > 0 THEN
      -- Wallets zurueckbuchen (Fallback: alles ans einloesende Restaurant)
      bd := coalesce(r.points_breakdown, jsonb_build_object(r.restaurant_id::text, r.points_spent));
      FOR k, v IN SELECT key, value::int FROM jsonb_each_text(bd) LOOP
        INSERT INTO guest_points (user_id, restaurant_id, balance)
        VALUES (r.user_id, k::uuid, v)
        ON CONFLICT (user_id, restaurant_id) DO UPDATE
          SET balance = guest_points.balance + v, updated_at = now();
      END LOOP;

      UPDATE profiles SET available_points = available_points + r.points_spent
        WHERE id = r.user_id RETURNING available_points INTO new_balance;
      INSERT INTO points_transactions
        (user_id, restaurant_id, type, amount, balance_after, reference_type, reference_id, description)
      VALUES
        (r.user_id, r.restaurant_id, 'refund', r.points_spent, new_balance, 'deal_redemption', r.id,
         'Rueckerstattung, Deal nicht eingeloest: ' || r.title);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- 7) Einloesen: Wallet-Logik mit Schalter
CREATE OR REPLACE FUNCTION public.redeem_deal(p_user_id uuid, p_deal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d deals%ROWTYPE;
  p profiles%ROWTYPE;
  r_accept boolean;
  cnt_user integer;
  cnt_total integer;
  v_code text;
  v_id uuid;
  v_expires timestamptz;
  new_balance integer;
  local_ts timestamp;
  dow integer;
  own_bal integer;
  remaining integer;
  breakdown jsonb := '{}'::jsonb;
  take integer;
  w RECORD;
BEGIN
  PERFORM expire_deal_redemptions(p_user_id);

  SELECT * INTO d FROM deals WHERE id = p_deal_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deal_not_found'; END IF;

  SELECT * INTO p FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF p.role <> 'guest' THEN RAISE EXCEPTION 'not_guest'; END IF;

  SELECT coalesce(accept_foreign_points, true) INTO r_accept FROM restaurants WHERE id = d.restaurant_id;

  local_ts := now() AT TIME ZONE 'Europe/Berlin';
  IF d.valid_from  IS NOT NULL AND d.valid_from  > now() THEN RAISE EXCEPTION 'deal_not_started'; END IF;
  IF d.valid_until IS NOT NULL AND d.valid_until < now() THEN RAISE EXCEPTION 'deal_expired'; END IF;

  dow := extract(dow FROM local_ts)::integer;
  IF d.valid_days IS NOT NULL AND jsonb_typeof(d.valid_days) = 'array'
     AND jsonb_array_length(d.valid_days) > 0
     AND NOT (d.valid_days @> to_jsonb(dow)) THEN
    RAISE EXCEPTION 'deal_not_today';
  END IF;

  IF d.valid_hours_start IS NOT NULL AND d.valid_hours_end IS NOT NULL
     AND NOT (local_ts::time BETWEEN d.valid_hours_start AND d.valid_hours_end) THEN
    RAISE EXCEPTION 'deal_not_now';
  END IF;

  SELECT count(*) INTO cnt_user FROM deal_redemptions
    WHERE deal_id = p_deal_id AND user_id = p_user_id AND status IN ('pending', 'confirmed', 'used');
  IF cnt_user >= coalesce(d.max_per_user, 1) THEN RAISE EXCEPTION 'user_limit_reached'; END IF;

  IF d.max_redemptions IS NOT NULL THEN
    SELECT count(*) INTO cnt_total FROM deal_redemptions
      WHERE deal_id = p_deal_id AND status IN ('pending', 'confirmed', 'used');
    IF cnt_total >= d.max_redemptions THEN RAISE EXCEPTION 'deal_sold_out'; END IF;
  END IF;

  -- Guthaben pruefen und aus den Wallets abbuchen
  SELECT balance INTO own_bal FROM guest_points WHERE user_id = p_user_id AND restaurant_id = d.restaurant_id FOR UPDATE;
  own_bal := coalesce(own_bal, 0);

  IF d.points_required > 0 THEN
    IF r_accept THEN
      IF p.available_points < d.points_required THEN RAISE EXCEPTION 'insufficient_points'; END IF;
    ELSE
      IF own_bal < d.points_required THEN RAISE EXCEPTION 'insufficient_own_points'; END IF;
    END IF;

    remaining := d.points_required;
    -- eigenes Wallet zuerst
    take := least(remaining, own_bal);
    IF take > 0 THEN
      UPDATE guest_points SET balance = balance - take, updated_at = now()
        WHERE user_id = p_user_id AND restaurant_id = d.restaurant_id;
      breakdown := breakdown || jsonb_build_object(d.restaurant_id::text, take);
      remaining := remaining - take;
    END IF;
    -- bei offenem Restaurant: aus den anderen Wallets (groesste zuerst)
    IF remaining > 0 AND r_accept THEN
      FOR w IN
        SELECT restaurant_id, balance FROM guest_points
        WHERE user_id = p_user_id AND restaurant_id <> d.restaurant_id AND balance > 0
        ORDER BY balance DESC FOR UPDATE
      LOOP
        EXIT WHEN remaining <= 0;
        take := least(remaining, w.balance);
        UPDATE guest_points SET balance = balance - take, updated_at = now()
          WHERE user_id = p_user_id AND restaurant_id = w.restaurant_id;
        breakdown := breakdown || jsonb_build_object(w.restaurant_id::text, take);
        remaining := remaining - take;
      END LOOP;
    END IF;
    IF remaining > 0 THEN RAISE EXCEPTION 'insufficient_points'; END IF;
  END IF;

  LOOP
    v_code := gen_redeem_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM deal_redemptions WHERE redemption_code = v_code);
  END LOOP;
  v_expires := now() + interval '30 minutes';

  INSERT INTO deal_redemptions
    (deal_id, user_id, restaurant_id, status, points_spent, redeemed_at, expires_at, redemption_code, points_breakdown)
  VALUES
    (p_deal_id, p_user_id, d.restaurant_id, 'pending', d.points_required, now(), v_expires, v_code, breakdown)
  RETURNING id INTO v_id;

  UPDATE deals SET total_redemptions = total_redemptions + 1 WHERE id = p_deal_id;

  new_balance := p.available_points;
  IF d.points_required > 0 THEN
    UPDATE profiles SET available_points = available_points - d.points_required
      WHERE id = p_user_id RETURNING available_points INTO new_balance;
    INSERT INTO points_transactions
      (user_id, restaurant_id, type, amount, balance_after, reference_type, reference_id, description)
    VALUES
      (p_user_id, d.restaurant_id, 'spent', -d.points_required, new_balance, 'deal_redemption', v_id,
       'Eingeloest: ' || d.title);
  END IF;

  RETURN jsonb_build_object(
    'redemption_id', v_id,
    'redemption_code', v_code,
    'expires_at', v_expires,
    'points_spent', d.points_required,
    'available_points', new_balance
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.redeem_deal(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_deal_redemptions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_deal(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_deal_redemptions(uuid) TO service_role;

SELECT 'ok_033' AS result,
  (SELECT count(*) FROM guest_points) AS wallets,
  (SELECT count(*) FROM information_schema.columns WHERE table_name='restaurants' AND column_name='accept_foreign_points') AS toggle_col;
