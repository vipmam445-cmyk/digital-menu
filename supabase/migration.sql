-- ============================================================
-- Elshaday Menu — Supabase Schema Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  name JSONB NOT NULL,
  description JSONB NOT NULL,
  ingredients JSONB NOT NULL,
  allergens JSONB NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  calories INTEGER NOT NULL DEFAULT 0,
  prep_time TEXT NOT NULL DEFAULT '10-15',
  image TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  is_best_seller BOOLEAN NOT NULL DEFAULT false,
  is_signature BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_spicy BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  "isFasting" BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(sort_order);

-- 3. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_itemId ON reviews("itemId");

-- 4. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "tableNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL DEFAULT '',
  "phoneNumber" TEXT NOT NULL DEFAULT '',
  "specialNotes" TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL,
  "totalAmount" REAL NOT NULL CHECK ("totalAmount" >= 0),
  "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
  "paymentScreenshot" TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  "createdAt" TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders("createdAt" DESC);

-- 5. Enable Realtime for menu_items and categories
-- (Run separately if this fails: Dashboard > Realtime > Add tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE menu_items, categories;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE ONLY menu_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE ONLY categories;
  END IF;
END
$$;

-- 5. Seed default categories
INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('cat_breakfast', 'Breakfast', 'breakfast', 1),
  ('cat_lunch', 'Lunch & Dinner', 'lunch', 2),
  ('cat_drinks', 'Drinks', 'drinks', 3),
  ('cat_fastfood', 'Burger & Pizza', 'fastfood', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Categories: public read, authenticated write
CREATE POLICY "Public read categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Authenticated insert categories"
  ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update categories"
  ON categories FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete categories"
  ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- Menu items: public read, authenticated write
CREATE POLICY "Public read menu_items"
  ON menu_items FOR SELECT USING (true);

CREATE POLICY "Authenticated insert menu_items"
  ON menu_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update menu_items"
  ON menu_items FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete menu_items"
  ON menu_items FOR DELETE USING (auth.role() = 'authenticated');

-- Reviews: public read + insert, authenticated delete
CREATE POLICY "Public read reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Public insert reviews"
  ON reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated delete reviews"
  ON reviews FOR DELETE USING (auth.role() = 'authenticated');

-- Orders: public insert, authenticated read/update
CREATE POLICY "Public insert orders"
  ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated read orders"
  ON orders FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update orders"
  ON orders FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- Storage bucket setup (run in Supabase Dashboard > Storage)
-- Bucket name: menu-images
-- Public: true
-- File size limit: 5MB
-- Allowed MIME: image/jpeg, image/png, image/webp
-- ============================================================
-- Then add these RLS policies via SQL:
/*
CREATE POLICY "Public read menu-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated insert menu-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update menu-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete menu-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
*/
