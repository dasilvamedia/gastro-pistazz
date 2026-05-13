-- Migration 010: Subscriptions & Trial Management
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/drvhdrhyjbyjilaxuxjy/sql/new

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  plan                TEXT        NOT NULL DEFAULT 'professional',
  status              TEXT        NOT NULL DEFAULT 'trial',
  monthly_fee         INTEGER     DEFAULT 0,
  setup_fee           INTEGER     DEFAULT 0,
  setup_paid          BOOLEAN     DEFAULT FALSE,
  trial_duration_days INTEGER     DEFAULT 14,
  trial_started_at    TIMESTAMPTZ,
  trial_ends_at       TIMESTAMPTZ,
  trial_ended_early   BOOLEAN     DEFAULT FALSE,
  trial_ended_by      UUID        REFERENCES profiles(id),
  trial_converted     BOOLEAN     DEFAULT FALSE,
  trial_converted_at  TIMESTAMPTZ,
  custom_note         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_restaurant_id_idx ON subscriptions (restaurant_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "owner_read_own" ON subscriptions
  FOR SELECT USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
