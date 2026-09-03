-- 025: Deal-Einloesung atomar + bestaetigbar + ablaufend
--
-- Vorher: API machte INSERT + separates UPDATE ohne Sperre (Doppel-Einloesung,
-- negativer Kontostand moeglich), kein Bestaetigen durch das Restaurant,
-- Status blieb ewig 'pending', keine Rueckerstattung.
--
-- Jetzt: alle Geldbewegungen in EINER Postgres-Transaktion (FOR UPDATE auf
-- deals und profiles). Die API ist nur noch ein duenner Auth-Wrapper und ruft
-- die Funktionen ueber den Service-Role-Client. TTL eines Codes: 30 Minuten,
-- danach automatische Rueckerstattung (lazy beim Lesen + stuendlicher Cron).

ALTER TABLE deal_redemptions
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deal_redemptions_deal_status
  ON deal_redemptions(deal_id, status);
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_pending_exp
  ON deal_redemptions(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_user
  ON deal_redemptions(user_id, redeemed_at DESC);

-- 8 Zeichen, Alphabet ohne 0/O/1/I (auf dem Handy eindeutig ablesbar)
CREATE OR REPLACE FUNCTION public.gen_redeem_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  FROM generate_series(1, 8);
$$;

-- Abgelaufene Codes schliessen und Punkte zurueckgeben.
-- p_user_id NULL = alle Nutzer (Cron), sonst nur dieser Nutzer (lazy).
CREATE OR REPLACE FUNCTION public.expire_deal_redemptions(p_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  n integer := 0;
  new_balance integer;
BEGIN
  FOR r IN
    SELECT dr.id, dr.user_id, dr.deal_id, dr.restaurant_id, dr.points_spent, d.title
    FROM deal_redemptions dr
    JOIN deals d ON d.id = dr.deal_id
    WHERE dr.status = 'pending'
      AND dr.expires_at < now()
      AND (p_user_id IS NULL OR dr.user_id = p_user_id)
    FOR UPDATE OF dr SKIP LOCKED
  LOOP
    UPDATE deal_redemptions SET status = 'expired', refunded_at = now() WHERE id = r.id;
    UPDATE deals SET total_redemptions = greatest(total_redemptions - 1, 0) WHERE id = r.deal_id;

    IF r.points_spent > 0 THEN
      UPDATE profiles SET available_points = available_points + r.points_spent
        WHERE id = r.user_id
        RETURNING available_points INTO new_balance;
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

-- Gast loest einen Deal ein. Wirft sprechende Fehler, die die API auf
-- deutsche Meldungen mappt.
CREATE OR REPLACE FUNCTION public.redeem_deal(p_user_id uuid, p_deal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d deals%ROWTYPE;
  p profiles%ROWTYPE;
  cnt_user integer;
  cnt_total integer;
  v_code text;
  v_id uuid;
  v_expires timestamptz;
  new_balance integer;
  local_ts timestamp;
  dow integer;
BEGIN
  PERFORM expire_deal_redemptions(p_user_id);

  SELECT * INTO d FROM deals WHERE id = p_deal_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deal_not_found'; END IF;

  SELECT * INTO p FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF p.role <> 'guest' THEN RAISE EXCEPTION 'not_guest'; END IF;

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

  IF d.points_required > p.available_points THEN RAISE EXCEPTION 'insufficient_points'; END IF;

  LOOP
    v_code := gen_redeem_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM deal_redemptions WHERE redemption_code = v_code);
  END LOOP;
  v_expires := now() + interval '30 minutes';

  INSERT INTO deal_redemptions
    (deal_id, user_id, restaurant_id, status, points_spent, redeemed_at, expires_at, redemption_code)
  VALUES
    (p_deal_id, p_user_id, d.restaurant_id, 'pending', d.points_required, now(), v_expires, v_code)
  RETURNING id INTO v_id;

  UPDATE deals SET total_redemptions = total_redemptions + 1 WHERE id = p_deal_id;

  new_balance := p.available_points;
  IF d.points_required > 0 THEN
    UPDATE profiles SET available_points = available_points - d.points_required
      WHERE id = p_user_id
      RETURNING available_points INTO new_balance;
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

-- Restaurant bestaetigt einen Code. Ownership loest die API auf
-- (Impersonation-bewusst) und uebergibt die erlaubte restaurant_id.
CREATE OR REPLACE FUNCTION public.confirm_deal_redemption(p_code text, p_restaurant_id uuid, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r deal_redemptions%ROWTYPE;
  d_title text;
BEGIN
  SELECT * INTO r FROM deal_redemptions WHERE redemption_code = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'code_not_found'; END IF;
  IF r.restaurant_id <> p_restaurant_id THEN RAISE EXCEPTION 'wrong_restaurant'; END IF;
  IF r.status = 'used' THEN RAISE EXCEPTION 'already_used'; END IF;
  IF r.status IN ('expired', 'cancelled') THEN RAISE EXCEPTION 'expired'; END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at < now() THEN
    PERFORM expire_deal_redemptions(r.user_id);
    RAISE EXCEPTION 'expired';
  END IF;

  UPDATE deal_redemptions
    SET status = 'used', used_at = now(), confirmed_by = p_actor
    WHERE id = r.id;

  SELECT title INTO d_title FROM deals WHERE id = r.deal_id;

  RETURN jsonb_build_object(
    'kind', 'deal',
    'redemption_id', r.id,
    'deal_id', r.deal_id,
    'user_id', r.user_id,
    'restaurant_id', r.restaurant_id,
    'title', d_title,
    'points_spent', r.points_spent
  );
END $$;

-- Nur der Server (Service-Role) darf diese Funktionen aufrufen.
REVOKE EXECUTE ON FUNCTION public.gen_redeem_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_deal_redemptions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_deal(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_deal_redemption(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gen_redeem_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_deal_redemptions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_deal(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_deal_redemption(text, uuid, uuid) TO service_role;
