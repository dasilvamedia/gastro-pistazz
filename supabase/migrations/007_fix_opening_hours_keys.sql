-- Migration 007: Fix opening_hours JSON keys — German abbreviations → English
-- Run this in the Supabase SQL Editor.
--
-- WHY: An older version of the dashboard may have saved opening hours with
-- German short keys (mo, di, mi, do, fr, sa, so) instead of the English keys
-- (monday, tuesday, wednesday, thursday, friday, saturday, sunday) that the
-- current app code expects. This causes all days to show "Geschlossen" in the
-- guest app even though the owner has set correct hours.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Check which restaurants are affected
-- (Run this SELECT first to see what needs fixing)
SELECT
  id,
  name,
  opening_hours,
  CASE
    WHEN opening_hours ? 'mo'     THEN 'OLD German keys (mo/di/mi...)'
    WHEN opening_hours ? 'monday' THEN 'OK English keys (monday/tuesday...)'
    WHEN opening_hours IS NULL    THEN 'NULL – no hours set'
    ELSE 'Empty or unknown format'
  END AS hours_format
FROM restaurants
ORDER BY name;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Convert old German keys to English keys
-- Only touches rows that actually have the old format (WHERE opening_hours ? 'mo')
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE restaurants
SET opening_hours = (
  -- Build a new object with the correct English keys, using the German values
  jsonb_strip_nulls(jsonb_build_object(
    'monday',    opening_hours->'mo',
    'tuesday',   opening_hours->'di',
    'wednesday', opening_hours->'mi',
    'thursday',  opening_hours->'do',
    'friday',    opening_hours->'fr',
    'saturday',  opening_hours->'sa',
    'sunday',    opening_hours->'so'
  ))
)
WHERE opening_hours ? 'mo';   -- only rows with old German keys

-- Step 3: Verify the fix
SELECT id, name, opening_hours FROM restaurants ORDER BY name;
