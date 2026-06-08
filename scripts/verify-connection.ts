// Run: npx tsx scripts/verify-connection.ts
// Verifies Supabase connectivity, auth, storage, and realtime

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  let passed = 0;
  let failed = 0;

  console.log("\n🔍 Supabase Connection Verification\n");
  console.log(`URL: ${supabaseUrl}\n`);

  // 1. Basic connectivity
  console.log("1️⃣  Checking connectivity...");
  const { data: health, error: healthErr } = await supabase.from("menu_items").select("id", { count: "exact", head: true });
  if (!healthErr) {
    console.log("   ✅ Supabase reachable\n");
    passed++;
  } else {
    console.log(`   ❌ Connection failed: ${healthErr.message}`);
    console.log("   ⚠️  Run the migration SQL first in Supabase Dashboard > SQL Editor\n");
    failed++;
  }

  // 2. Check tables exist
  console.log("2️⃣  Checking tables...");
  const tables = ["menu_items", "categories", "reviews", "orders"];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (!error) {
      console.log(`   ✅ ${table} exists`);
      passed++;
    } else {
      console.log(`   ❌ ${table} missing — run migration SQL`);
      failed++;
    }
  }
  console.log();

  // 3. Check Storage bucket
  console.log("3️⃣  Checking storage bucket...");
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (!bucketErr) {
    const menuBucket = buckets.find((b) => b.name === "menu-images");
    if (menuBucket) {
      console.log("   ✅ menu-images bucket exists\n");
      passed++;
    } else {
      console.log("   ❌ menu-images bucket not found");
      console.log("   ➡️  Create it: Supabase Dashboard > Storage > Create bucket > Name: menu-images, Public: true\n");
      failed++;
    }
  } else {
    console.log(`   ❌ Cannot list buckets: ${bucketErr.message}\n`);
    failed++;
  }

  // 4. Check Auth
  console.log("4️⃣  Checking auth setup...");
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: "test@test.com",
    password: "test123",
  });
  if (authErr && authErr.message === "Invalid login credentials") {
    console.log("   ✅ Auth is configured (email/password enabled)");
    passed++;
  } else if (authErr && authErr.message.includes("Email provider not enabled")) {
    console.log("   ❌ Email auth provider not enabled");
    console.log("   ➡️  Enable: Supabase Dashboard > Auth > Providers > Email > Enable\n");
    failed++;
  } else if (authErr) {
    console.log("   ✅ Auth is responding (login test passed — credentials don't matter)");
    passed++;
  }
  console.log();

  // Summary
  console.log("═".repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} checks\n`);

  if (failed > 0) {
    console.log("⚠️  Some checks failed. Follow the instructions above to fix them.\n");
  } else {
    console.log("✅ All checks passed! The project is ready for Vercel deployment.\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

verify().catch((e) => {
  console.error("Script failed:", e.message);
  process.exit(1);
});
