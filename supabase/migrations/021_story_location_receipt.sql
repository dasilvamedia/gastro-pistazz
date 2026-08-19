-- Zusaetzliche Betrugssicherung fuer Story-Einreichungen: Standort bei
-- Einreichung + verpflichtender Kassenbon. Der Instagram-Mention-Webhook
-- bestaetigt nur "gerade gepostet", nicht "Foto gerade aufgenommen" oder
-- "Person ist gerade vor Ort" - das schliesst diese Luecke.
ALTER TABLE story_submissions
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS submitted_lat double precision,
  ADD COLUMN IF NOT EXISTS submitted_lng double precision,
  ADD COLUMN IF NOT EXISTS location_distance_m integer;
