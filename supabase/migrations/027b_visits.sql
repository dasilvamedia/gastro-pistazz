-- 027b: Besuche zaehlen + Idempotenz beim Punkte-Trigger
--
-- Vorher wurden visits / profiles.total_visits nie geschrieben (Besuche-
-- Statistik tot). visits hat UNIQUE(user_id, restaurant_id) und bedeutet
-- "bekannter Gast dieses Restaurants"; total_visits zaehlt jeden Besuch.
-- Voraussetzung: 027a (Enum-Wert 'nfc').

-- Punkte-Trigger: zusaetzlich Besuch zaehlen, und nie doppelt vergeben
-- (z.B. wenn ein Status von approved -> pending -> approved gesetzt wird).
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

-- NFC-Tap = physischer Besuch
CREATE OR REPLACE FUNCTION public.record_nfc_visit(p_user_id uuid, p_restaurant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET total_visits = total_visits + 1 WHERE id = p_user_id;
  INSERT INTO visits (user_id, restaurant_id, source)
  VALUES (p_user_id, p_restaurant_id, 'nfc'::visit_source)
  ON CONFLICT (user_id, restaurant_id) DO NOTHING;
END $$;

REVOKE EXECUTE ON FUNCTION public.record_nfc_visit(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_nfc_visit(uuid, uuid) TO service_role;
