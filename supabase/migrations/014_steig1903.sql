-- Migration 014: Steig 1903 — Restaurant + Owner-Account anlegen
-- Login: steig-1903 / Steig1903!
-- URL:   gastro.pistazz.io/restaurant-login

DO $$
DECLARE
  v_user_id   uuid := gen_random_uuid();
  v_email     text := 'steig-1903@gastro.pistazz.io';
  v_existing  uuid;
BEGIN

  -- 1. Prüfen ob User bereits existiert
  SELECT id INTO v_existing FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_existing IS NOT NULL THEN
    v_user_id := v_existing;
    -- Passwort aktualisieren
    UPDATE auth.users
    SET encrypted_password = crypt('Steig1903!', gen_salt('bf')),
        updated_at = now()
    WHERE id = v_existing;
  ELSE
    -- 2. Auth-User anlegen
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_super_admin, confirmation_sent_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      crypt('Steig1903!', gen_salt('bf')),
      now(), now(), now(),
      '{"full_name": "Steig 1903 Team"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, now()
    );
  END IF;

  -- 3. Profil anlegen / aktualisieren
  INSERT INTO profiles (id, full_name, role, onboarding_completed)
  VALUES (v_user_id, 'Steig 1903 Team', 'restaurant_owner', true)
  ON CONFLICT (id) DO UPDATE
    SET full_name = 'Steig 1903 Team',
        role = 'restaurant_owner';

  -- 4. Restaurant anlegen (oder owner_id updaten falls schon existiert)
  INSERT INTO restaurants (
    name, slug, type, city, address, zip,
    phone, email, website, instagram_handle,
    description, primary_color, points_per_story,
    is_active, is_verified, contract_status, owner_id
  ) VALUES (
    'Steig 1903',
    'steig-1903',
    'restaurant',
    'Vaihingen an der Enz',
    'Hans-Krieg-Straße 13',
    '71665',
    '+49 7042 3766663',
    'email@steig1903.de',
    'https://www.steig1903.de',
    'steig1903',
    'Steig 1903 ist ein Restaurant im restaurierten historischen Bahnhofsgebäude von 1903 am Vaihinger Stadtbahnhof. Regionale schwäbische und internationale Küche, Bahnwaggons als Terrasse und Speisewagen, regionale Lieferanten.',
    '#8B6A3E',
    500,
    true, false, 'prospect',
    v_user_id
  )
  ON CONFLICT (slug) DO UPDATE
    SET owner_id  = v_user_id,
        is_active = true;

  -- 5. Öffnungszeiten setzen
  UPDATE restaurants SET
    opening_hours = '{
      "monday":    {"open": "17:30", "close": "23:00"},
      "tuesday":   {"open": "11:30", "close": "23:00"},
      "wednesday": {"open": "11:30", "close": "23:00"},
      "thursday":  {"open": "17:30", "close": "23:00"},
      "friday":    {"open": "17:30", "close": "23:00"},
      "saturday":  {"open": "15:00", "close": "23:00"},
      "sunday":    {"open": "12:00", "close": "22:00"}
    }'::jsonb,
    opening_hours_note = 'Di & Mi: Mittagstisch 11:30–14:00 Uhr (außer Feiertage)'
  WHERE slug = 'steig-1903';

  RAISE NOTICE 'Steig 1903 erfolgreich angelegt. Owner-ID: %', v_user_id;
END $$;

-- Ergebnis anzeigen
SELECT r.id, r.name, r.slug, r.city, r.instagram_handle, r.is_active,
       p.full_name AS owner_name
FROM restaurants r
LEFT JOIN profiles p ON p.id = r.owner_id
WHERE r.slug = 'steig-1903';
