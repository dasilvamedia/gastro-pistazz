-- ============================================================
-- Migration 002: Multi-Tenant Platform
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add super_admin to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Add contract_status to restaurants if not exists
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS contract_status TEXT NOT NULL DEFAULT 'active'
    CHECK (contract_status IN ('trial', 'active', 'paused', 'churned')),
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 149.00,
  ADD COLUMN IF NOT EXISTS contract_start DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Leads table (CRM for potential restaurant partners)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  restaurant_name TEXT,
  restaurant_type TEXT,
  city TEXT,
  website TEXT,

  -- Pipeline
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'interested', 'proposal_sent', 'negotiating', 'won', 'lost', 'on_hold')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Conversion
  converted_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,

  -- Meta
  source TEXT DEFAULT 'manual',
  tags TEXT[],
  notes TEXT
);

-- 4. Lead Activities (timeline)
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'status_change', 'proposal_sent')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- 5. Proposals (sales offers)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Target: either a lead or existing restaurant
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 149.00,
  setup_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  features TEXT[] DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,

  -- PDF
  pdf_url TEXT,

  -- Created by
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_city_idx ON leads(city);
CREATE INDEX IF NOT EXISTS lead_activities_lead_id_idx ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS proposals_lead_id_idx ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);

-- 7. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access leads
CREATE POLICY "Super admin full access to leads" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin full access to lead_activities" ON lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin full access to proposals" ON proposals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 9. Seed: Add super_admin role to Marcio's account
-- Replace with actual Marcio user ID from Supabase Auth dashboard
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'marcio@pistazz.io';

-- 10. Sample lead data (optional)
INSERT INTO leads (name, email, restaurant_name, restaurant_type, city, status, priority, source)
VALUES
  ('Thomas Müller', 'thomas@burgerhub.de', 'Burger Hub München', 'restaurant', 'München', 'new', 'high', 'cold_outreach'),
  ('Lisa Weber', 'lisa@pizzamax.de', 'Pizza Max', 'restaurant', 'Stuttgart', 'contacted', 'medium', 'referral'),
  ('Marco Rossi', 'marco@lacucina.de', 'La Cucina', 'restaurant', 'Berlin', 'interested', 'high', 'inbound'),
  ('Sarah Klein', 'sarah@sushitime.de', 'Sushi Time', 'restaurant', 'Hamburg', 'proposal_sent', 'medium', 'cold_outreach'),
  ('Felix Braun', 'felix@tacobar.de', 'Taco Bar', 'bar', 'Frankfurt', 'new', 'low', 'manual')
ON CONFLICT DO NOTHING;
