#!/usr/bin/env node

/**
 * Apply Migration 008: Create payroll_line_items table with UUID primary key
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
  console.log("🔄 Starting Migration 008: Create payroll_line_items table\n");

  try {
    // Read migration SQL
    const sqlPath = path.resolve(
      __dirname,
      "../../sql/migrations/008-create-payroll-table.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("📋 Migration will create:");
    console.log("  1. payroll_line_items table with UUID primary key");
    console.log("  2. Indexes for performance (7 indexes)");
    console.log("  3. RLS policies (5 policies)");
    console.log("  4. updated_at trigger\n");

    console.log("🔨 Executing migration...\n");

    // Run migration
    await pool.query(sql);

    console.log("✅ Migration complete!\n");

    // Verify structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payroll_line_items'
      AND column_name IN ('id', 'worker_id', 'work_date', 'amount', 'week_period')
      ORDER BY ordinal_position;
    `);

    console.log("📊 Table structure:");
    structureResult.rows.forEach((col) => {
      console.log(
        `  ${col.column_name}: ${col.data_type} ${
          col.is_nullable === "NO" ? "NOT NULL" : "NULLABLE"
        }`
      );
    });

    // Check id type
    const idTypeResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'payroll_line_items' AND column_name = 'id';
    `);

    const idType = idTypeResult.rows[0].data_type;
    if (idType === "uuid") {
      console.log("\n✅ PRIMARY KEY is UUID (Best Practice)");
    } else {
      console.log(`\n❌ WARNING: PRIMARY KEY is ${idType}, expected uuid`);
    }

    console.log("\n📝 Next steps:");
    console.log("  1. Import data: node scripts/migration/import-payroll.js");
    console.log(
      "  2. Verify: SELECT COUNT(*) FROM payroll_line_items; (should be 496)"
    );
    console.log("  3. Test API: node scripts/test/test-payroll-api.js\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\n💡 You can run the SQL manually in Supabase Dashboard:");
    console.error("   File: sql/migrations/008-create-payroll-table.sql\n");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
