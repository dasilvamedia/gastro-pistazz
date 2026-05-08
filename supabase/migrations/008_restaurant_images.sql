-- Migration 008: Restaurant logos, cover images + korrekte Öffnungszeiten
-- Reihenfolge: ERST 007 ausführen (Schlüssel-Konvertierung), DANN diese Datei
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Schritt 1: Status-Diagnose (immer zuerst ausführen) ──────────────────────
SELECT
  id, name, slug, city,
  CASE WHEN logo_url  IS NOT NULL THEN '✅ Logo'   ELSE '❌ kein Logo'   END AS logo,
  CASE WHEN cover_url IS NOT NULL THEN '✅ Cover'  ELSE '❌ kein Cover'  END AS cover,
  google_rating,
  google_review_count,
  opening_hours
FROM restaurants
ORDER BY name;

-- ─────────────────────────────────────────────────────────────────────────────
-- Beach Bar am Bucher Stausee (Rainau) — Betreiber: Marcio da Silva
-- Öffnungszeiten: Di–Sa 11–19 Uhr, So/Feiertage 10–19 Uhr, Mo geschlossen
-- Saisonal (bei schlechtem Wetter geschlossen)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE restaurants SET
  logo_url         = 'https://www.kiosk-leuchtturm.com/s/misc/logo.jpg',
  cover_url        = 'https://www.kiosk-leuchtturm.com/s/cc_images/cache_23865994.JPG',
  website          = 'https://www.kiosk-leuchtturm.com/the-beach-bar/',
  instagram_handle = 'welovebeachbar',
  address          = 'Bucher Stausee',
  zip              = '73492',
  city             = 'Rainau',
  opening_hours    = '{
    "monday":    {"open": "00:00", "close": "00:00", "closed": true},
    "tuesday":   {"open": "11:00", "close": "19:00"},
    "wednesday": {"open": "11:00", "close": "19:00"},
    "thursday":  {"open": "11:00", "close": "19:00"},
    "friday":    {"open": "11:00", "close": "19:00"},
    "saturday":  {"open": "11:00", "close": "19:00"},
    "sunday":    {"open": "10:00", "close": "19:00"}
  }'::jsonb,
  opening_hours_note = 'Saisonal geöffnet · Bei schlechtem Wetter geschlossen'
WHERE name ILIKE '%Beach Bar%'
   OR slug ILIKE '%beach-bar%'
   OR instagram_handle = 'welovebeachbar';

-- ─────────────────────────────────────────────────────────────────────────────
-- Barfüsser Wirtshaus Aalen — Google ⭐ 4.2 (415 Bewertungen)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE restaurants SET
  logo_url            = 'https://www.barfuesser-aalen.de/wp-content/uploads/2022/02/logo.svg',
  cover_url           = 'https://img02.restaurantguru.com/cc37-Barfusser-Hausbrauerei-Aalen-food.jpg',
  website             = 'https://www.barfuesser-aalen.de/',
  phone               = '+49 7361 8049974',
  address             = 'Helferstraße 12',
  zip                 = '73430',
  city                = 'Aalen',
  google_rating       = 4.2,
  google_review_count = 415,
  opening_hours       = '{
    "monday":    {"open": "11:00", "close": "23:00"},
    "tuesday":   {"open": "11:00", "close": "23:00"},
    "wednesday": {"open": "11:00", "close": "23:00"},
    "thursday":  {"open": "11:00", "close": "23:00"},
    "friday":    {"open": "11:00", "close": "00:00"},
    "saturday":  {"open": "11:00", "close": "00:00"},
    "sunday":    {"open": "11:00", "close": "22:00"}
  }'::jsonb
WHERE name ILIKE '%Barfüsser%'
   OR name ILIKE '%Barfuesser%';

-- ─────────────────────────────────────────────────────────────────────────────
-- Vorlage für weitere Restaurants (ID aus Diagnose kopieren):
-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE restaurants SET
--   logo_url  = 'https://...',
--   cover_url = 'https://...',
--   opening_hours = '{"monday": {"open":"11:00","close":"23:00"}, ...}'::jsonb
-- WHERE id = 'DEINE-RESTAURANT-ID-HIER';
