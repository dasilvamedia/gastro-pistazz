-- Migration 004: Add Google rating + review count + opening_hours_note to restaurants
-- Run this in the Supabase SQL editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_review_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS opening_hours_note TEXT DEFAULT NULL;

COMMENT ON COLUMN restaurants.google_rating IS 'Google Maps star rating (1.0–5.0), entered manually by the restaurant owner';
COMMENT ON COLUMN restaurants.google_review_count IS 'Number of Google reviews shown next to the star rating';
COMMENT ON COLUMN restaurants.opening_hours_note IS 'Optional note shown below opening hours on the guest card';
