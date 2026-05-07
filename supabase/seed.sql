-- ============================================================
-- Seed Data for Development
-- ============================================================

-- Note: Run this AFTER creating a user via Supabase Auth UI
-- Replace <YOUR_USER_UUID> with your actual user ID from auth.users

-- Sample Restaurant Owner Profile (run after auth sign-up)
-- UPDATE profiles SET role = 'restaurant_owner' WHERE email = 'owner@example.com';

-- Sample Restaurant
INSERT INTO restaurants (
  id, owner_id, name, slug, type, description, city, zip, address,
  phone, email, instagram_handle,
  points_per_story, points_per_reel, points_per_google_review, points_per_receipt, points_per_post,
  stamp_card_enabled, stamp_card_total, stamp_card_reward,
  is_active, is_verified, is_featured, avg_rating, total_customers
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000', -- replace with real owner ID
  'Pistazz Kitchen',
  'pistazz-kitchen',
  'restaurant',
  'Das coolste Restaurant der Stadt! 🍕🍝 Mediterrane Küche mit modernem Twist. Teile deine Story und kassiere Deals!',
  'München',
  '80331',
  'Maximilianstraße 42, München',
  '+49 89 123456',
  'hallo@pistazzkitchen.de',
  'pistazzkitchen',
  500, 750, 300, 100, 400,
  TRUE, 8, 'Ein Dessert deiner Wahl gratis 🍮',
  TRUE, TRUE, TRUE, 4.8, 342
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'Pistachio Bar',
  'pistachio-bar',
  'bar',
  'Craft Cocktails & Snacks 🍹 Der angesagteste Spot für After-Work und Nachtleben!',
  'München',
  '80333',
  'Sendlinger Straße 15, München',
  '+49 89 654321',
  'hallo@pistachiobar.de',
  'pistachiobar',
  500, 750, 300, 100, 400,
  FALSE, 8, NULL,
  TRUE, TRUE, FALSE, 4.6, 189
);

-- Sample Deals
INSERT INTO deals (
  restaurant_id, title, description, trigger, status,
  reward_type, reward_value, points_required,
  valid_days, badge_text, badge_color
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '20% auf deine Rechnung 💰',
  'Poste eine Instagram Story von deinem Besuch und zeige sie dem Kellner – du bekommst 20% Rabatt auf deine gesamte Rechnung!',
  'instagram_story',
  'active',
  'discount_percent', '20', 0,
  '[1,2,3,4,5]', '20% Rabatt', '#8BB06A'
),
(
  '11111111-1111-1111-1111-111111111111',
  'Gratis Cocktail für Reel 🍹',
  'Erstelle ein Reel in unserem Restaurant und erhalte einen Cocktail deiner Wahl GRATIS!',
  'instagram_reel',
  'active',
  'free_item', 'Cocktail', 0,
  '[0,1,2,3,4,5,6]', 'Gratis!', '#E5B84C'
),
(
  '11111111-1111-1111-1111-111111111111',
  '500 Punkte einlösen: Vorspeise gratis 🥗',
  'Löse 500 Punkte ein und genieße eine Vorspeise deiner Wahl kostenfrei!',
  'stamp_card',
  'active',
  'free_item', 'Vorspeise', 500,
  '[0,1,2,3,4,5,6]', '500 Punkte', '#577A3D'
),
(
  '22222222-2222-2222-2222-222222222222',
  '2-für-1 Cocktails ⭐',
  'Hinterlasse eine Google Bewertung und trinke den zweiten Cocktail gratis!',
  'google_review',
  'active',
  'bogo', '2for1', 0,
  '[4,5,6]', '2 für 1', '#E86B5A'
);
