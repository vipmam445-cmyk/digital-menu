// One-time Supabase setup script
// Usage: SERVICE_ROLE_KEY=your-key npx tsx scripts/setup-all.ts
// Get the service_role key from: Supabase Dashboard > Project Settings > API > service_role key

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  console.log("\n🚀 Elshaday Menu — Supabase Auto Setup\n");

  // 1. Run migration SQL
  console.log("1️⃣  Running schema migration...");
  const migrationSql = readFileSync(join(process.cwd(), "supabase", "migration.sql"), "utf-8");
  const { error: sqlErr } = await admin.rpc("exec_sql", { query: migrationSql });
  if (sqlErr) {
    console.log("   ⚠️  exec_sql RPC not available — please run the SQL manually in Dashboard > SQL Editor");
    console.log("   File: supabase/migration.sql");
    console.log("   Error:", sqlErr.message, "\n");
  } else {
    console.log("   ✅ Migration executed\n");
  }

  // 2. Enable Realtime on menu_items
  console.log("2️⃣  Enabling Realtime for menu_items...");
  const { error: realtimeErr } = await admin.rpc("exec_sql", {
    query: `
      BEGIN;
        DROP PUBLICATION IF EXISTS supabase_realtime;
        CREATE PUBLICATION supabase_realtime FOR TABLE menu_items, categories;
      COMMIT;
    `,
  });
  if (realtimeErr) {
    console.log("   ⚠️  Enable manually: Go to Supabase Dashboard > Realtime > add menu_items and categories tables\n");
  } else {
    console.log("   ✅ Realtime enabled for menu_items and categories\n");
  }

  // 3. Create Storage bucket
  console.log("3️⃣  Creating storage bucket...");
  const { data: bucket, error: bucketErr } = await admin.storage.createBucket("menu-images", {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (bucketErr && bucketErr.message.includes("already exists")) {
    console.log("   ✅ menu-images bucket already exists\n");
  } else if (bucketErr) {
    console.log(`   ❌ Failed: ${bucketErr.message}`);
    console.log("   ➡️  Create manually: Supabase Dashboard > Storage > Create bucket\n");
  } else {
    console.log("   ✅ menu-images bucket created\n");
  }

  // 4. Check if admin user exists, if not prompt
  console.log("4️⃣  Checking admin user...");
  const { data: users, error: usersErr } = await admin.auth.admin.listUsers();
  if (usersErr) {
    console.log("   ⚠️  Cannot list users\n");
  } else {
    const adminUsers = users.users.filter((u) => u.email);
    if (adminUsers.length === 0) {
      console.log("   ⚠️  No admin users found.");
      console.log("   ➡️  Create manually: Supabase Dashboard > Auth > Users > Invite user\n");
    } else {
      console.log(`   ✅ ${adminUsers.length} user(s) registered\n`);
    }
  }

  // 5. Seed default categories & menu items
  console.log("5️⃣  Seeding data...");
  const { data: existing } = await anon.from("categories").select("id");
  if (existing && existing.length > 0) {
    console.log("   ✅ Data already seeded (categories exist)\n");
  } else {
    console.log("   ➡️  Run seed script after DB is ready: npx tsx scripts/seed.ts\n");
  }

  // Summary
  console.log("═".repeat(50));
  console.log("\n📋 Post-Setup Checklist (do manually in Supabase Dashboard):\n");
  console.log("  ☐  Auth > Providers > Email — make sure it's enabled");
  console.log("  ☐  SQL Editor — run supabase/migration.sql if not done automatically");
  console.log("  ☐  Auth > Users — invite yourself as admin");
  console.log("  ☐  Storage > menu-images — verify bucket exists and is public");
  console.log("  ☐  Realtime — add menu_items and categories to the publication");
  console.log("  ☐  Run: npx tsx scripts/seed.ts  (to migrate hardcoded menu data)");
  console.log("  ☐  Run: npx tsx scripts/verify-connection.ts  (to confirm everything works)\n");

  process.exit(0);
}

run().catch((e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
