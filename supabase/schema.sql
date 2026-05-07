-- ============================================================
-- Gastro Pistazz Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('guest', 'restaurant_owner', 'admin');
CREATE TYPE user_tier AS ENUM ('bronze', 'silber', 'gold', 'platin');
CREATE TYPE restaurant_type AS ENUM ('restaurant', 'bar', 'bistro', 'cafe', 'imbiss', 'food_truck', 'hotel');
CREATE TYPE deal_trigger AS ENUM ('instagram_story', 'instagram_reel', 'instagram_post', 'google_review', 'receipt_upload', 'stamp_card', 'custom');
CREATE TYPE deal_status AS ENUM ('active', 'paused', 'expired', 'draft');
CREATE TYPE reward_type AS ENUM ('discount_percent', 'discount_fixed', 'free_item', 'bogo', 'custom');
CREATE TYPE redemption_status AS ENUM ('pending', 'confirmed', 'used', 'expired', 'cancelled');
CREATE TYPE submission_type AS ENUM ('instagram_story', 'instagram_reel', 'instagram_post', 'google_review', 'receipt');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE transaction_type AS ENUM ('earned', 'spent', 'bonus', 'expired', 'refund');
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'whatsapp', 'in_app');
CREATE TYPE visit_source AS ENUM ('qr_scan', 'story', 'receipt', 'manual');

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'guest',
  tier user_tier NOT NULL DEFAULT 'bronze',
  total_points INTEGER NOT NULL DEFAULT 0,
  available_points INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_stories INTEGER NOT NULL DEFAULT 0,
  instagram_handle TEXT,
  instagram_connected BOOLEAN NOT NULL DEFAULT FALSE,
  phone TEXT,
  city TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type restaurant_type NOT NULL DEFAULT 'restaurant',
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  phone TEXT,
  email TEXT,
  website TEXT,
  instagram_handle TEXT,
  google_place_id TEXT,
  opening_hours JSONB DEFAULT '{}',
  points_per_story INTEGER NOT NULL DEFAULT 500,
  points_per_reel INTEGER NOT NULL DEFAULT 750,
  points_per_google_review INTEGER NOT NULL DEFAULT 300,
  points_per_receipt INTEGER NOT NULL DEFAULT 100,
  points_per_post INTEGER NOT NULL DEFAULT 400,
  stamp_card_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stamp_card_total INTEGER NOT NULL DEFAULT 8,
  stamp_card_reward TEXT,
  primary_color TEXT DEFAULT '#8BB06A',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  total_stories INTEGER NOT NULL DEFAULT 0,
  total_reach INTEGER NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  trigger deal_trigger NOT NULL,
  status deal_status NOT NULL DEFAULT 'draft',
  reward_type reward_type NOT NULL DEFAULT 'discount_percent',
  reward_value TEXT,
  points_required INTEGER NOT NULL DEFAULT 0,
  min_order_value DECIMAL(10,2),
  max_redemptions INTEGER,
  max_per_user INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  valid_days JSONB DEFAULT '[0,1,2,3,4,5,6]',
  valid_hours_start TIME,
  valid_hours_end TIME,
  total_redemptions INTEGER NOT NULL DEFAULT 0,
  total_reach INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  badge_text TEXT,
  badge_color TEXT DEFAULT '#8BB06A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Redemptions
CREATE TABLE IF NOT EXISTS deal_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status redemption_status NOT NULL DEFAULT 'pending',
  points_spent INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  redemption_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 8))
);

-- Story Submissions
CREATE TABLE IF NOT EXISTS story_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type submission_type NOT NULL,
  status submission_status NOT NULL DEFAULT 'pending',
  media_url TEXT,
  thumbnail_url TEXT,
  instagram_media_id TEXT,
  instagram_permalink TEXT,
  caption TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Points Transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stamp Cards
CREATE TABLE IF NOT EXISTS stamp_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  current_stamps INTEGER NOT NULL DEFAULT 0,
  total_stamps_required INTEGER NOT NULL DEFAULT 8,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  reward_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Visits
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source visit_source NOT NULL DEFAULT 'manual',
  receipt_url TEXT
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QR Codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 12)),
  label TEXT,
  target_url TEXT,
  scan_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_deals_restaurant ON deals(restaurant_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deal_redemptions_user ON deal_redemptions(user_id);
CREATE INDEX idx_deal_redemptions_deal ON deal_redemptions(deal_id);
CREATE INDEX idx_story_submissions_user ON story_submissions(user_id);
CREATE INDEX idx_story_submissions_restaurant ON story_submissions(restaurant_id);
CREATE INDEX idx_story_submissions_status ON story_submissions(status);
CREATE INDEX idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_visits_user ON visits(user_id);
CREATE INDEX idx_visits_restaurant ON visits(restaurant_id);
CREATE INDEX idx_stamp_cards_user ON stamp_cards(user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_owner'))
);

-- Restaurants policies
CREATE POLICY "Anyone can view active restaurants" ON restaurants FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Owners can manage own restaurant" ON restaurants FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Admins can manage all restaurants" ON restaurants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Deals policies
CREATE POLICY "Anyone can view active deals" ON deals FOR SELECT USING (status = 'active');
CREATE POLICY "Owners can manage own deals" ON deals FOR ALL USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);

-- Deal redemptions policies
CREATE POLICY "Users can view own redemptions" ON deal_redemptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create redemptions" ON deal_redemptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can view restaurant redemptions" ON deal_redemptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);

-- Story submissions policies
CREATE POLICY "Users can view own submissions" ON story_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create submissions" ON story_submissions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can view and manage restaurant submissions" ON story_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);

-- Points transactions policies
CREATE POLICY "Users can view own transactions" ON points_transactions FOR SELECT USING (user_id = auth.uid());

-- Stamp cards policies
CREATE POLICY "Users can view own stamp cards" ON stamp_cards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own stamp cards" ON stamp_cards FOR INSERT WITH CHECK (user_id = auth.uid());

-- Visits policies
CREATE POLICY "Users can view own visits" ON visits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create visits" ON visits FOR INSERT WITH CHECK (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- QR codes policies
CREATE POLICY "Owners can manage own QR codes" ON qr_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Anyone can view active QR codes" ON qr_codes FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Award points when story approved
CREATE OR REPLACE FUNCTION public.award_story_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  points_to_award INTEGER;
  restaurant RECORD;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT * INTO restaurant FROM restaurants WHERE id = NEW.restaurant_id;

    CASE NEW.type
      WHEN 'instagram_story' THEN points_to_award := restaurant.points_per_story;
      WHEN 'instagram_reel' THEN points_to_award := restaurant.points_per_reel;
      WHEN 'instagram_post' THEN points_to_award := restaurant.points_per_post;
      WHEN 'google_review' THEN points_to_award := restaurant.points_per_google_review;
      WHEN 'receipt' THEN points_to_award := restaurant.points_per_receipt;
      ELSE points_to_award := 100;
    END CASE;

    UPDATE profiles
    SET total_points = total_points + points_to_award,
        available_points = available_points + points_to_award,
        total_stories = total_stories + 1
    WHERE id = NEW.user_id;

    INSERT INTO points_transactions (user_id, restaurant_id, type, amount, balance_after, reference_type, reference_id, description)
    SELECT NEW.user_id, NEW.restaurant_id, 'earned', points_to_award, available_points, 'story_submission', NEW.id,
           'Punkte für ' || NEW.type
    FROM profiles WHERE id = NEW.user_id;

    UPDATE story_submissions SET points_awarded = points_to_award, verified_at = NOW() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_story_approved
  AFTER UPDATE ON story_submissions
  FOR EACH ROW EXECUTE FUNCTION public.award_story_points();

-- Update tier based on total points
CREATE OR REPLACE FUNCTION public.update_user_tier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.total_points != OLD.total_points THEN
    NEW.tier = CASE
      WHEN NEW.total_points >= 10000 THEN 'platin'::user_tier
      WHEN NEW.total_points >= 5000 THEN 'gold'::user_tier
      WHEN NEW.total_points >= 1500 THEN 'silber'::user_tier
      ELSE 'bronze'::user_tier
    END;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_points_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_tier();

-- Update restaurant timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stamp_cards_updated_at BEFORE UPDATE ON stamp_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
