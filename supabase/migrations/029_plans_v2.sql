-- 029: Pakete v2 (Professional 49/849, Premium 109/1500, Enterprise 169/2349)
--
-- ERST den Code deployen (liest keine restaurants.monthly_fee mehr), DANN
-- diese Migration ausfuehren.
--
-- Mapping nach Position, damit Bestandskunden ihre Rechte behalten:
--   alt starter      -> neu professional
--   alt professional -> neu premium (hatte Analytics + Stempelkarte)
--   alt enterprise   -> neu enterprise
-- Zahlende Kunden behalten ihren Vertragspreis, nur Testphasen bekommen die
-- neuen Listenpreise.

UPDATE subscriptions SET plan = CASE plan
  WHEN 'starter'      THEN 'professional'
  WHEN 'professional' THEN 'premium'
  WHEN 'enterprise'   THEN 'enterprise'
  ELSE 'professional' END;

UPDATE subscriptions SET
  monthly_fee = CASE plan WHEN 'professional' THEN 49 WHEN 'premium' THEN 109 ELSE 169 END,
  setup_fee   = CASE plan WHEN 'professional' THEN 849 WHEN 'premium' THEN 1500 ELSE 2349 END
WHERE status = 'trial';

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('professional', 'premium', 'enterprise'));
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'professional';
ALTER TABLE subscriptions ALTER COLUMN trial_duration_days SET DEFAULT 30;

-- Alte Preisquelle Nr. 4 (149 EUR Default) entfernen; Umsatz kommt aus subscriptions
ALTER TABLE restaurants DROP COLUMN IF EXISTS monthly_fee;
ALTER TABLE restaurants DROP COLUMN IF EXISTS contract_status;

SELECT 'ok_029' AS result, plan, status, count(*) FROM subscriptions GROUP BY plan, status;
