-- Migration 003: Fix RLS policies to allow NULL is_active values
-- Problem: USING (is_active = TRUE) treats NULL as not-true → blocks restaurants/QR codes
--          where is_active was never explicitly set, even though they're not deactivated.
-- Fix:    USING (is_active IS NOT FALSE) → allows TRUE and NULL, blocks only FALSE.

-- ── Restaurants ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON restaurants;
CREATE POLICY "Anyone can view active restaurants" ON restaurants
  FOR SELECT USING (is_active IS NOT FALSE);

-- ── QR Codes ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view active QR codes" ON qr_codes;
DROP POLICY IF EXISTS "public_qr_codes_select" ON qr_codes;
CREATE POLICY "Anyone can view active QR codes" ON qr_codes
  FOR SELECT USING (is_active IS NOT FALSE);

-- ── Also fix target_url domain for any QR codes still pointing at app.pistazz.io ──
-- Updates existing QR codes that were created with the old domain.
UPDATE qr_codes
SET target_url = REPLACE(target_url, 'https://app.pistazz.io', 'https://gastro.pistazz.io')
WHERE target_url LIKE '%app.pistazz.io%';
