#!/usr/bin/env node

/**
 * Apply Migration 007: Fix clock_ins table to use UUID primary key
 *
 * This will:
 * 1. Drop existing clock_ins table with INTEGER id
 * 2. Recreate with UUID primary key (best practice)
 * 3. Confirm table is ready for re-import
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  console.log("🔄 Starting Migration 007: Fix clock_ins UUID primary key\n");

  // Check if pg module is available
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in .env.local");
    console.error("📝 This migration requires direct database access.");
    console.error(
      "💡 Alternative: Run the SQL manually in Supabase Dashboard\n"
    );
    console.error("SQL file: sql/migrations/007-fix-clockins-uuid.sql");
    process.exit(1);
  }

  try {
    // Read migration SQL
    const sqlPath = path.resolve(
      __dirname,
      "../../sql/migrations/007-fix-clockins-uuid.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("📋 Migration will:");
    console.log(
      "  1. Drop existing clock_ins table (loses 788 imported records)"
    );
    console.log("  2. Recreate with UUID primary key");
    console.log("  3. Add indexes and RLS policies");
    console.log("  4. Enable updated_at trigger\n");

    // Count existing records
    const countResult = await pool.query("SELECT COUNT(*) FROM clock_ins");
    const existingCount = parseInt(countResult.rows[0].count);

    console.log(
      `⚠️  WARNING: This will delete ${existingCount} existing clock-in records!`
    );
    console.log("   Records will be re-imported after migration.\n");

    console.log("🔨 Executing migration...\n");

    // Run migration
    await pool.query(sql);

    console.log("✅ Migration complete!\n");

    // Verify new structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clock_ins'
      AND column_name IN ('id', 'worker_id', 'clock_in_time')
      ORDER BY ordinal_position;
    `);

    console.log("📊 New table structure:");
    structureResult.rows.forEach((col) => {
      console.log(
        `  ${col.column_name}: ${col.data_type} ${
          col.is_nullable === "NO" ? "NOT NULL" : "NULLABLE"
        }`
      );
    });

    // Check id type specifically
    const idTypeResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'clock_ins' AND column_name = 'id';
    `);

    const idType = idTypeResult.rows[0].data_type;
    if (idType === "uuid") {
      console.log("\n✅ PRIMARY KEY is now UUID (Best Practice)");
    } else {
      console.log(`\n❌ WARNING: PRIMARY KEY is ${idType}, expected uuid`);
    }

    console.log("\n📝 Next steps:");
    console.log(
      "  1. Re-run import: node scripts/migration/import-clockins.js"
    );
    console.log("  2. Verify: SELECT COUNT(*) FROM clock_ins; (should be 788)");
    console.log("  3. Test API: node scripts/test/test-clockins-api.js\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\n💡 You can run the SQL manually in Supabase Dashboard:");
    console.error("   File: sql/migrations/007-fix-clockins-uuid.sql\n");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
