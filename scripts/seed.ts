// Run: npx tsx scripts/seed.ts
// Requires SERVICE_ROLE_KEY env var (get from Supabase Dashboard > Project Settings > API)
// Or set it as: $env:SERVICE_ROLE_KEY="eyJ..." ; npx tsx scripts/seed.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { menuItems } from "../src/data/menuData";

// Load .env.local manually
try {
  const envPath = join(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SECRET_KEY || process.env.SERVICE_ROLE_KEY;

if (!secretKey) {
  console.error("\n❌ Secret key not found.\n");
  console.error("To get your Supabase secret key:");
  console.error("  1. Go to https://supabase.com/dashboard/project/gleksgpxnzvpibhkmcpo/settings/api");
  console.error("  2. Copy the 'secret key' (starts with sb_secret_...)");
  console.error("  3. Run the script again with:");
  console.error('     $env:SECRET_KEY="sb_secret_..." ; npx tsx scripts/seed.ts\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding categories...");
  const categories = [
    { id: "cat_breakfast", name: "Breakfast", slug: "breakfast", sort_order: 1 },
    { id: "cat_lunch", name: "Lunch & Dinner", slug: "lunch", sort_order: 2 },
    { id: "cat_drinks", name: "Drinks", slug: "drinks", sort_order: 3 },
    { id: "cat_fastfood", name: "Burger & Pizza", slug: "fastfood", sort_order: 4 },
  ];
  const { error: catErr } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "id" });
  if (catErr) {
    console.error("Category seed error:", catErr);
    process.exit(1);
  }
  console.log(`  Inserted ${categories.length} categories`);

  console.log("Seeding menu items...");
  const batchSize = 20;
  for (let i = 0; i < menuItems.length; i += batchSize) {
    const batch = menuItems.slice(i, i + batchSize).map((item) => ({
      ...item,
      isFasting: item.isFasting ?? false,
      subcategory: item.subcategory ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("menu_items")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`  Batch ${i / batchSize + 1} error (trying individual inserts)...`);
      for (const item of batch) {
        const { error: itemErr } = await supabase
          .from("menu_items")
          .upsert(item, { onConflict: "id" });
        if (itemErr) {
          console.error(`  ❌ Skipped ${item.id} (${item.name?.en}): ${itemErr.message}`);
        }
      }
    }
    console.log(`  Inserted batch ${i / batchSize + 1} (${batch.length} items)`);
  }
  console.log(`  Total: ${menuItems.length} items seeded`);

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
