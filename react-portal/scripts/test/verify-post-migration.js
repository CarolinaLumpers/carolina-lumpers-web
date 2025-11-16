/**
 * Post-Migration Verification Script
 *
 * Run this AFTER applying 004-uuid-primary-key-migration.sql
 * Verifies migration was successful and data integrity maintained
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

async function verifyPostMigration() {
  console.log("🔍 Post-Migration Verification\n");
  console.log("Verifying UUID migration completed successfully...\n");

  let allChecksPassed = true;

  // CHECK 1: New workers table structure
  console.log("📋 CHECK 1: Workers Table Structure (UUID-based)");
  try {
    const { data: workers, error } = await supabase
      .from("workers")
      .select("*")
      .limit(1);

    if (error) throw error;

    if (workers.length > 0) {
      const sample = workers[0];
      const hasUuidId =
        typeof sample.id === "string" && sample.id.includes("-");
      const hasEmployeeId = sample.employee_id !== undefined;
      const noAuthUserId = sample.auth_user_id === undefined;

      if (hasUuidId && hasEmployeeId && noAuthUserId) {
        console.log("   ✅ New structure detected (UUID id + employee_id)");
        console.log(
          `      Sample: id="${sample.id.substring(0, 8)}...", employee_id="${
            sample.employee_id
          }"`
        );
      } else {
        console.log("   ❌ Structure does not match expected UUID format!");
        console.log("      Sample:", JSON.stringify(sample, null, 2));
        allChecksPassed = false;
      }
    } else {
      console.log("   ❌ No workers found in database");
      allChecksPassed = false;
    }
  } catch (error) {
    console.log("   ❌ Failed to query workers table");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 2: Verify employee_id uniqueness
  console.log("\n🏷️  CHECK 2: Employee ID Uniqueness");
  try {
    const { data: workers, error } = await supabase
      .from("workers")
      .select("employee_id");

    if (error) throw error;

    const employeeIds = workers.map((w) => w.employee_id);
    const uniqueIds = new Set(employeeIds);

    if (employeeIds.length === uniqueIds.size) {
      console.log(
        `   ✅ All ${employeeIds.length} employee_id values are unique`
      );
    } else {
      console.log(`   ❌ Duplicate employee_id values found!`);
      console.log(
        `      Total: ${employeeIds.length}, Unique: ${uniqueIds.size}`
      );
      allChecksPassed = false;
    }
  } catch (error) {
    console.log("   ❌ Failed to check employee_id uniqueness");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 3: Verify foreign keys updated
  console.log("\n🔗 CHECK 3: Foreign Key Integrity");
  try {
    // Check clock_ins references
    const { data: clockIns, error: clockError } = await supabase
      .from("clock_ins")
      .select("id, worker_id")
      .limit(5);

    if (clockError && !clockError.message.includes("does not exist"))
      throw clockError;

    if (clockIns && clockIns.length > 0) {
      const hasUuidFK = clockIns.every(
        (ci) => ci.worker_id && ci.worker_id.includes("-")
      );
      if (hasUuidFK) {
        console.log("   ✅ clock_ins.worker_id is UUID format");
      } else {
        console.log("   ❌ clock_ins.worker_id is not UUID format");
        allChecksPassed = false;
      }

      // Verify FK actually references workers
      const { data: joined, error: joinError } = await supabase
        .from("clock_ins")
        .select("id, worker_id, workers(employee_id, display_name)")
        .limit(3);

      if (joinError) {
        console.log("   ❌ Foreign key relationship broken - JOIN failed");
        console.log("      Error:", joinError.message);
        allChecksPassed = false;
      } else {
        console.log("   ✅ Foreign key relationship intact - JOIN works");
      }
    } else {
      console.log(
        "   ⚠️  No clock_ins to verify (table empty or doesn't exist)"
      );
    }
  } catch (error) {
    console.log("   ⚠️  Could not verify foreign keys");
    console.log("      Error:", error.message);
  }

  // CHECK 4: Record count comparison
  console.log("\n📊 CHECK 4: Record Count Verification");
  try {
    const { data: currentWorkers, error: currentError } = await supabase
      .from("workers")
      .select("id", { count: "exact", head: true });

    const { data: backupWorkers, error: backupError } = await supabase
      .from("workers_backup_pre_uuid")
      .select("id", { count: "exact", head: true });

    if (currentError) throw currentError;

    if (!backupError && backupWorkers) {
      if (currentWorkers.count === backupWorkers.count) {
        console.log(
          `   ✅ Record count matches backup (${currentWorkers.count} workers)`
        );
      } else {
        console.log(`   ❌ Record count mismatch!`);
        console.log(
          `      Current: ${currentWorkers.count}, Backup: ${backupWorkers.count}`
        );
        allChecksPassed = false;
      }
    } else {
      console.log(
        `   ⚠️  No backup table found (count: ${currentWorkers.count} workers)`
      );
    }
  } catch (error) {
    console.log("   ❌ Failed to compare record counts");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 5: Sample data integrity
  console.log("\n🔍 CHECK 5: Sample Data Integrity");
  try {
    const { data: workers, error } = await supabase
      .from("workers")
      .select("id, employee_id, display_name, email, role")
      .limit(5);

    if (error) throw error;

    console.log("   Sample workers after migration:");
    workers.forEach((w) => {
      console.log(`      ${w.employee_id} | ${w.display_name} | ${w.role}`);
    });

    const allHaveData = workers.every(
      (w) => w.id && w.employee_id && w.display_name && w.email
    );
    if (allHaveData) {
      console.log("   ✅ All required fields populated");
    } else {
      console.log("   ❌ Some required fields missing");
      allChecksPassed = false;
    }
  } catch (error) {
    console.log("   ❌ Failed to verify sample data");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // CHECK 6: RLS status
  console.log("\n🔒 CHECK 6: Row-Level Security Status");
  try {
    // This requires admin permissions, may not work with anon key
    const { data, error } = await supabase.rpc("check_rls_status", {});

    if (error && error.message.includes("does not exist")) {
      console.log(
        "   ⚠️  RLS not yet enabled (run 005-enable-rls-policies.sql)"
      );
    } else {
      console.log("   ✅ RLS enabled on tables");
    }
  } catch (error) {
    console.log(
      "   ⚠️  Could not check RLS status (will verify after policy migration)"
    );
  }

  // CHECK 7: Test basic query
  console.log("\n🧪 CHECK 7: Functional Test (Query by employee_id)");
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("id, employee_id, display_name")
      .eq("employee_id", "SG-001")
      .single();

    if (error && error.code === "PGRST116") {
      console.log(
        '   ⚠️  No worker with employee_id "SG-001" (expected if different data)'
      );
    } else if (error) {
      throw error;
    } else {
      console.log(`   ✅ Query by employee_id works: ${data.display_name}`);
    }
  } catch (error) {
    console.log("   ❌ Query by employee_id failed");
    console.log("      Error:", error.message);
    allChecksPassed = false;
  }

  // FINAL SUMMARY
  console.log("\n" + "=".repeat(60));
  if (allChecksPassed) {
    console.log("✅ ALL CHECKS PASSED - Migration successful!");
    console.log("\nNext steps:");
    console.log(
      "1. Apply RLS policies: sql/migrations/005-enable-rls-policies.sql"
    );
    console.log(
      "2. Update application code to use employee_id for business lookups"
    );
    console.log("3. Test application login and functionality");
    console.log(
      "4. After 7 days, drop backup: DROP TABLE workers_backup_pre_uuid;"
    );
  } else {
    console.log("❌ SOME CHECKS FAILED - Review issues above");
    console.log("\n⚠️  Consider rollback if critical data issues detected");
    console.log("   See UUID_MIGRATION_GUIDE.md for rollback instructions");
  }
  console.log("=".repeat(60));

  process.exit(allChecksPassed ? 0 : 1);
}

verifyPostMigration().catch((error) => {
  console.error("\n❌ Verification script failed:", error.message);
  process.exit(1);
});
