/**
 * Pre-Migration Verification Script
 *
 * Run this BEFORE applying 004-uuid-primary-key-migration.sql
 * Verifies that all prerequisites are met for a safe migration
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing environment variables!");
  console.error("   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyPreMigration() {
  console.log("🔍 Pre-Migration Verification\n");
  console.log("Checking prerequisites for UUID migration...\n");

  let allChecksPassed = true;

  // CHECK 1: Current workers table structure
  console.log("📋 CHECK 1: Workers Table Structure");
  try {
    const { data: workers, error } = await supabase
      .from("workers")
      .select("*")
      .limit(1);

    if (error) throw error;

    if (workers.length > 0) {
      const sample = workers[0];
      const hasTextId =
        typeof sample.id === "string" && !sample.id.includes("-");
      const hasAuthUserId = sample.auth_user_id !== undefined;

      if (hasTextId && hasAuthUserId) {
        console.log(
          "   ✅ Current structure detected (TEXT id + auth_user_id)"
        );
        console.log(
          `      Sample: id="${sample.id}", auth_user_id="${sample.auth_user_id}"`
        );
      } else {
        console.log("   ⚠️  Unexpected structure!");
        console.log("      Sample:", JSON.stringify(sample, null, 2));
        allChecksPassed = false;
      }
    } else {
      console.log("   ⚠️  No workers found in database");
      allChecksPassed = false;
    }
  } catch (error) {
    console.log("   ❌ Failed to query workers table");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 2: All workers have Supabase Auth accounts
  console.log("\n👤 CHECK 2: Supabase Auth Accounts");
  try {
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("id, employee_id, display_name, email, auth_user_id");

    if (workersError) throw workersError;

    const totalWorkers = workers.length;
    const workersWithAuth = workers.filter((w) => w.auth_user_id).length;
    const workersWithoutAuth = workers.filter((w) => !w.auth_user_id);

    console.log(`   Total workers: ${totalWorkers}`);
    console.log(`   With auth: ${workersWithAuth}`);
    console.log(`   Without auth: ${totalWorkers - workersWithAuth}`);

    if (workersWithoutAuth.length > 0) {
      console.log("\n   ⚠️  Workers missing Supabase Auth:");
      workersWithoutAuth.forEach((w) => {
        console.log(`      - ${w.display_name} (${w.email})`);
      });
      console.log(
        "\n   ⚠️  Run scripts/setup/create-all-worker-auth.js before migration!"
      );
      allChecksPassed = false;
    } else {
      console.log("   ✅ All workers have Supabase Auth accounts");
    }
  } catch (error) {
    console.log("   ❌ Failed to check auth accounts");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 3: Record counts for verification
  console.log("\n📊 CHECK 3: Record Counts (for post-migration verification)");
  try {
    const tables = [
      "workers",
      "clock_ins",
      "time_edit_requests",
      "payroll_line_items",
    ];
    const counts = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error && !error.message.includes("does not exist")) throw error;
        counts[table] = count || 0;
        console.log(`   ${table}: ${counts[table]} records`);
      } catch (err) {
        if (err.message.includes("does not exist")) {
          counts[table] = 0;
          console.log(`   ${table}: 0 records (table doesn't exist yet)`);
        } else {
          throw err;
        }
      }
    }

    // Check w9_submissions OR w9_records
    try {
      const { count: w9Count, error: w9Error } = await supabase
        .from("w9_submissions")
        .select("*", { count: "exact", head: true });

      counts["w9_submissions"] = w9Count || 0;
      console.log(`   w9_submissions: ${counts["w9_submissions"]} records`);
    } catch (err) {
      try {
        const { count: w9Count, error: w9Error } = await supabase
          .from("w9_records")
          .select("*", { count: "exact", head: true });

        counts["w9_records"] = w9Count || 0;
        console.log(`   w9_records: ${counts["w9_records"]} records`);
      } catch (err2) {
        console.log(
          `   w9_submissions/w9_records: 0 records (table doesn't exist yet)`
        );
      }
    }

    console.log(
      "\n   ✅ Record counts captured (verify these match after migration)"
    );
  } catch (error) {
    console.log("   ❌ Failed to count records");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 4: Verify auth_user_id references valid auth.users
  console.log("\n🔗 CHECK 4: Auth User ID Validity");
  try {
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("auth_user_id, display_name, email")
      .not("auth_user_id", "is", null);

    if (workersError) throw workersError;

    const {
      data: { users },
      error: authError,
    } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const authUUIDs = new Set(users.map((u) => u.id));
    const invalidRefs = workers.filter((w) => !authUUIDs.has(w.auth_user_id));

    if (invalidRefs.length > 0) {
      console.log(
        `   ⚠️  Found ${invalidRefs.length} workers with invalid auth_user_id:`
      );
      invalidRefs.forEach((w) => {
        console.log(
          `      - ${w.display_name} (${w.email}) → ${w.auth_user_id}`
        );
      });
      allChecksPassed = false;
    } else {
      console.log(
        `   ✅ All ${workers.length} auth_user_id references are valid`
      );
    }
  } catch (error) {
    console.log(
      "   ⚠️  Could not verify auth references (may require admin permissions)"
    );
    console.log("      Error:", error.message);
  }

  // CHECK 5: Check for existing backup tables
  console.log("\n💾 CHECK 5: Existing Backup Tables");
  try {
    const { data, error } = await supabase
      .from("workers_backup_pre_uuid")
      .select("*")
      .limit(1);

    if (data && data.length > 0) {
      console.log(
        '   ⚠️  Backup table "workers_backup_pre_uuid" already exists!'
      );
      console.log("      This indicates a previous migration attempt.");
      console.log(
        "      Please review or drop the existing backup before proceeding."
      );
      allChecksPassed = false;
    } else {
      console.log("   ✅ No existing backup tables (clean state)");
    }
  } catch (error) {
    if (error.message.includes("does not exist")) {
      console.log("   ✅ No existing backup tables (clean state)");
    } else {
      console.log("   ⚠️  Could not check for backup tables");
      console.log("      Error:", error.message);
    }
  }

  // FINAL SUMMARY
  console.log("\n" + "=".repeat(60));
  if (allChecksPassed) {
    console.log("✅ ALL CHECKS PASSED - Ready for UUID migration!");
    console.log("\nNext steps:");
    console.log("1. Create manual backup (recommended):");
    console.log("   - Go to Supabase Dashboard → SQL Editor");
    console.log(
      "   - Run: CREATE TABLE workers_manual_backup AS SELECT * FROM workers;"
    );
    console.log(
      "2. Apply migration: sql/migrations/004-uuid-primary-key-migration.sql"
    );
    console.log("3. Run post-migration verification");
  } else {
    console.log("❌ CHECKS FAILED - Please fix issues before migration");
    console.log("\nRecommended actions:");
    console.log("1. Review failures above");
    console.log(
      "2. Run scripts/setup/create-all-worker-auth.js if auth missing"
    );
    console.log("3. Re-run this verification script");
  }
  console.log("=".repeat(60));

  process.exit(allChecksPassed ? 0 : 1);
}

verifyPreMigration().catch((error) => {
  console.error("\n❌ Verification script failed:", error.message);
  process.exit(1);
});
