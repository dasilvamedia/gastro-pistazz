-- ============================================================
-- Gastro Pistazz — Migration 002: Full Schema Extension
-- Run in Supabase SQL Editor. Safe to run on existing databases.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enums (safe IF NOT EXISTS workaround)
-- ------------------------------------------------------------

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE restaurant_type ADD VALUE IF NOT EXISTS 'brauhaus';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'neu',
    'kontaktiert',
    'demo_gebucht',
    'angebot_gesendet',
    'abgeschlossen',
    'verloren'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'anruf',
    'email',
    'whatsapp',
    'meeting',
    'demo',
    'notiz',
    'status_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. Add missing columns to existing tables
-- ------------------------------------------------------------

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS contract_start DATE,
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 149;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 3. Leads table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  typ TEXT,
  stadt TEXT,
  adresse TEXT,
  plz TEXT,
  telefon TEXT,
  email TEXT,
  website TEXT,
  google_rating NUMERIC(2,1),
  google_reviews INTEGER,
  kueche TEXT,
  preisklasse TEXT,
  instagram_aktiv BOOLEAN DEFAULT FALSE,
  match_rating INTEGER DEFAULT 3,
  begruendung TEXT,
  status lead_status DEFAULT 'neu',
  naechste_aktion_datum DATE,
  naechste_aktion_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. Lead Activities table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. Proposals table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  monthly_fee NUMERIC(10,2),
  setup_fee NUMERIC(10,2) DEFAULT 0,
  features JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. QR Codes table (replace if exists with new definition)
-- ------------------------------------------------------------

-- Drop old table if it was created without the new default
-- (schema.sql already defines this table; ADD COLUMN approach is safer)
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS target_url TEXT;

-- If qr_codes does not yet exist, create it:
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  label TEXT,
  target_url TEXT NOT NULL DEFAULT '',
  scan_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. Indexes
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_stadt ON leads(stadt);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_restaurant ON proposals(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant ON profiles(restaurant_id);

-- ------------------------------------------------------------
-- 8. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Leads: super_admin only
DROP POLICY IF EXISTS "super_admin_leads" ON leads;
CREATE POLICY "super_admin_leads" ON leads
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Lead activities: super_admin only
DROP POLICY IF EXISTS "super_admin_lead_activities" ON lead_activities;
CREATE POLICY "super_admin_lead_activities" ON lead_activities
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Proposals: super_admin only
DROP POLICY IF EXISTS "super_admin_proposals" ON proposals;
CREATE POLICY "super_admin_proposals" ON proposals
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- QR Codes: owner or super_admin
DROP POLICY IF EXISTS "owner_qr_codes" ON qr_codes;
CREATE POLICY "owner_qr_codes" ON qr_codes
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "public_qr_codes_select" ON qr_codes;
CREATE POLICY "public_qr_codes_select" ON qr_codes
  FOR SELECT USING (is_active = TRUE);

-- Super admin can manage all restaurants
DROP POLICY IF EXISTS "super_admin_restaurants" ON restaurants;
CREATE POLICY "super_admin_restaurants" ON restaurants
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Super admin can view all profiles
DROP POLICY IF EXISTS "super_admin_profiles" ON profiles;
CREATE POLICY "super_admin_profiles" ON profiles
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- ------------------------------------------------------------
-- 9. Seed: 16 restaurants (safe insert — skips duplicates)
-- ------------------------------------------------------------

INSERT INTO restaurants (
  name, slug, type, city, address, zip, phone, website,
  instagram_handle, description, is_active, is_verified,
  contract_status, primary_color, monthly_fee
)
SELECT
  v.name, v.slug, v.type::restaurant_type, v.city, v.address, v.zip,
  v.phone, v.website, v.instagram_handle, v.description,
  v.is_active, v.is_verified, v.contract_status, v.primary_color,
  v.monthly_fee
FROM (VALUES
  ('Aposto Aalen','aposto-aalen','restaurant','Aalen','Marktplatz 26 (KUBUS)','73430','07361 9753290','https://aposto.eu/aalen','@apostoaalen','Italienisches Restaurant & Bar im KUBUS am Marktplatz.',true,true,'active','#8BB06A',149.00),
  ('Enchilada Aalen','enchilada-aalen','restaurant','Aalen','Friedhofstr. 19','73430','07361 5560810','https://enchilada.de/aalen','@enchilada_aalen','Mexikanisches Restaurant & Cocktailbar.',true,true,'active','#C41E3A',149.00),
  ('Barfüsser Wirtshaus Aalen','barfuesser-aalen','brauhaus','Aalen','Radgasse 10','73430','07361 5281390','https://barfuesser.de','@barfuesser','Hausbrauerei mit eigenem Bier und Biergarten.',true,true,'active','#D4A843',149.00),
  ('Yuma Sushi & Tapas','yuma-aalen','restaurant','Aalen','Bahnhofstr. 55','73430','07361 5284840','https://yuma-aalen.de','@yuma_aalen','Fusionsküche: Sushi, Tapas und asiatische Bowls.',true,true,'active','#2D2D2D',149.00),
  ('Rambazamba Aalen','rambazamba-aalen','bar','Aalen','Marktplatz','73430','','','@rambazamba_aalen','Bar & Café mit Terrasse am Marktplatz.',true,true,'active','#E86B5A',149.00),
  ('Osteria Aalen','osteria-aalen','restaurant','Aalen','Hirschbachstr. 50','73431','07361 5560870','','@osteria_aalen','Authentisch italienische Osteria.',true,true,'active','#4A7C59',149.00),
  ('Podium Aalen','podium-aalen','cafe','Aalen','Marktplatz 4','73430','07361 889444','https://podiumaalen.de','@podiumaalen','Café, Restaurant & Bar im denkmalgeschützten Alten Rathaus.',true,true,'active','#8B6914',149.00),
  ('Konrad Café & Bar','konrad-aalen','cafe','Aalen','Reichsstädter Str.','73430','','','@konrad_aalen','Neues Café, Bar & Concept Store.',true,true,'active','#2D2D2D',149.00),
  ('Rosmarie','rosmarie-gmuend','restaurant','Schwäbisch Gmünd','Rinderbacher Gasse 3','73525','07171 9278944','https://rosmarie-gmuend.de','@rosmarie_gmuend','Vegetarisch/Regionale Küche mit modernem Twist.',true,true,'active','#6B8E4E',149.00),
  ('Hi, Charles','hi-charles-gmuend','restaurant','Schwäbisch Gmünd','Remsstr. 5','73525','07171 1043780','https://hicharles.de','@hicharles_gd','Rooftop Restaurant & Bar mit Skyline-View.',true,true,'active','#1C1F1A',149.00),
  ('Bassano','bassano-gmuend','bar','Schwäbisch Gmünd','Bocksgasse','73525','07171 63990','','@bassano_gd','Cocktailbar & Lounge in der Bocksgasse.',true,true,'active','#8B0000',149.00),
  ('The Jaxt','the-jaxt-ellwangen','restaurant','Ellwangen','','73479','','https://thejaxt.com','@thejaxt','Modernes Restaurant in Ellwangen.',true,true,'active','#2D2D2D',149.00),
  ('Rosengarten Ellwangen','rosengarten-ellwangen','restaurant','Ellwangen','','73479','','','@rosengarten_ew','Restaurant mit Garten in Ellwangen.',true,true,'active','#C41E3A',149.00),
  ('Leuchtturm Bucher Stausee','leuchtturm-bucher-stausee','restaurant','Ellwangen','Bucher Stausee','73479','','','@leuchtturm_bucher','Restaurant am Bucher Stausee mit Seeblick.',true,true,'active','#4A90D9',149.00),
  ('Beach Bar Bucher Stausee','beach-bar-bucher-stausee','bar','Ellwangen','Bucher Stausee','73479','','','@beachbar_bucher','Sommer-Bar direkt am Bucher Stausee.',true,true,'active','#F0B429',149.00),
  ('Waldschänke Ellwangen','waldschaenke-ellwangen','restaurant','Ellwangen','Langres Str. 5','73479','07961 9681810','https://waldschaenke.de','@waldschaenke_ew','Kreatives Crossover-Restaurant. Chef Pierre Grebenisan.',true,true,'active','#577A3D',149.00)
) AS v(name,slug,type,city,address,zip,phone,website,instagram_handle,description,is_active,is_verified,contract_status,primary_color,monthly_fee)
WHERE NOT EXISTS (
  SELECT 1 FROM restaurants WHERE slug = v.slug
);

-- ------------------------------------------------------------
-- End of migration 002
-- ------------------------------------------------------------
