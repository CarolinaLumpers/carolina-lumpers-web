#!/usr/bin/env node

/**
 * Apply Migration 007: Fix clock_ins table to use UUID primary key
 * Uses Supabase client RPC to execute SQL directly
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log("🔄 Starting Migration 007: Fix clock_ins UUID primary key\n");

  try {
    // Check existing records
    console.log("📊 Checking current state...");
    const { count: existingCount } = await supabase
      .from("clock_ins")
      .select("*", { count: "exact", head: true });

    console.log(
      `   Found ${existingCount} existing records (will be deleted)\n`
    );

    // Read migration SQL
    const sqlPath = path.resolve(
      __dirname,
      "../../sql/migrations/007-fix-clockins-uuid.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("📋 Migration will:");
    console.log("  1. Drop existing clock_ins table (INTEGER id)");
    console.log("  2. Recreate with UUID primary key");
    console.log("  3. Add indexes and RLS policies");
    console.log("  4. Enable updated_at trigger\n");

    console.log("⚠️  WARNING: This will delete all existing clock-in records!");
    console.log("   Records will be re-imported after migration.\n");

    console.log("🔨 Executing migration via Supabase SQL...\n");

    // Execute SQL using Supabase RPC
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      // RPC might not exist, try alternative method
      console.log(
        "⚠️  RPC method not available, attempting direct execution...\n"
      );

      // Split SQL into individual statements and execute
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("--"));

      console.log(`   Executing ${statements.length} SQL statements...\n`);

      // Note: This won't work with standard Supabase client
      // User needs to run SQL manually in Dashboard
      throw new Error(
        "Direct SQL execution requires manual run in Supabase Dashboard"
      );
    }

    console.log("✅ Migration complete!\n");

    // Verify new structure
    console.log("🔍 Verifying new table structure...");
    const { data: testInsert, error: insertError } = await supabase
      .from("clock_ins")
      .insert({
        worker_id: "624652a2-830c-43d5-b76a-cfeff1c8270a", // Steve's UUID
        clock_in_time: new Date().toISOString(),
        latitude: 35.7796,
        longitude: -78.6382,
        distance_miles: 0.05,
        status: "pending",
        device: "Migration Test",
      })
      .select()
      .single();

    if (insertError) {
      console.log("❌ Test insert failed:", insertError.message);
    } else {
      console.log("✅ Test insert successful!");
      console.log(
        `   New record id: ${testInsert.id} (type: ${typeof testInsert.id})`
      );

      // Check if it's a UUID format
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          testInsert.id
        );
      if (isUUID) {
        console.log("✅ PRIMARY KEY is now UUID (Best Practice)\n");
      } else {
        console.log("❌ PRIMARY KEY format unexpected:", testInsert.id, "\n");
      }

      // Clean up test record
      await supabase.from("clock_ins").delete().eq("id", testInsert.id);
    }

    console.log("📝 Next steps:");
    console.log(
      "  1. Re-import records: node scripts/migration/import-clockins.js"
    );
    console.log("  2. Verify count: Should import 788 records");
    console.log("  3. Test API: All methods should work with UUID ids\n");
  } catch (error) {
    console.error("\n❌ Migration requires manual execution\n");
    console.error("📝 Please run the SQL manually in Supabase Dashboard:\n");
    console.error(
      "   1. Go to: https://supabase.com/dashboard/project/dxbybjxpglpslmoenqyg/sql"
    );
    console.error("   2. Open file: sql/migrations/007-fix-clockins-uuid.sql");
    console.error("   3. Copy and paste the entire SQL");
    console.error('   4. Click "Run" to execute\n');
    console.error("Then run: node scripts/migration/import-clockins.js\n");
  }
}

runMigration().catch(console.error);
