-- Migration: Update restaurant_type ENUM
-- Run this ONCE in the Supabase SQL Editor.
-- After running, remove the DB_TYPE_MAP workaround from:
--   app/api/dashboard/restaurant/route.ts

-- Step 1: Convert column to text so we can change the enum
ALTER TABLE restaurants ALTER COLUMN type TYPE text;

-- Step 2: Remap existing old values to new ones
UPDATE restaurants SET type = 'cafe'       WHERE type = 'bistro';
UPDATE restaurants SET type = 'restaurant' WHERE type = 'imbiss';
UPDATE restaurants SET type = 'restaurant' WHERE type = 'food_truck';
UPDATE restaurants SET type = 'restaurant' WHERE type = 'hotel';

-- Step 3: Drop default first (it depends on the enum), then drop the enum
ALTER TABLE restaurants ALTER COLUMN type DROP DEFAULT;
DROP TYPE IF EXISTS restaurant_type;

-- Step 4: Create new enum with correct values
CREATE TYPE restaurant_type AS ENUM (
  'restaurant',
  'bar',
  'cafe',
  'fine_dining',
  'biergarten',
  'eisdiele'
);

-- Step 5: Convert column back to the new enum
ALTER TABLE restaurants
  ALTER COLUMN type TYPE restaurant_type
  USING type::restaurant_type;

-- Step 6: Restore the default
ALTER TABLE restaurants ALTER COLUMN type SET DEFAULT 'restaurant';
