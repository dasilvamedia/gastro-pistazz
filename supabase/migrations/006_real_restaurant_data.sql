-- Migration 006: Real restaurant data — update by slug
-- Run this in the Supabase SQL editor AFTER running migrations 004 + 005
-- Update the slug values to match your actual restaurants

-- ============================================================
-- Barfüsser Wirtshaus Aalen
-- Google Maps: 4.2 ⭐ (~415 Bewertungen)
-- ============================================================
UPDATE restaurants SET
  google_rating       = 4.2,
  google_review_count = 415,
  website             = 'https://www.barfuesser-aalen.de/',
  phone               = '+49 7361 8049974',
  address             = 'Helferstraße 12',
  zip                 = '73430',
  city                = 'Aalen',
  latitude            = 48.83710,
  longitude           = 10.09392,
  logo_url            = 'https://www.barfuesser-aalen.de/wp-content/uploads/2022/02/logo.svg',
  cover_url           = 'https://img02.restaurantguru.com/cc37-Barfusser-Hausbrauerei-Aalen-food.jpg',
  google_place_id     = NULL   -- fill in from Google Place ID Finder if needed
WHERE slug = 'barfuesser-wirtshaus'
   OR slug = 'barfuesser-wirtshaus-aalen'
   OR name ILIKE '%Barfüsser%';

-- ============================================================
-- To find your restaurant slugs, run:
-- SELECT id, name, slug FROM restaurants ORDER BY name;
-- ============================================================
