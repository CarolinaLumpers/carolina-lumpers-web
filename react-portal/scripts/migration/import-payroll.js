/**
 * Import Payroll Line Items to Supabase
 *
 * This script imports historical payroll data from Google Sheets export
 * into the Supabase payroll_line_items table, mapping employee_id to UUID.
 *
 * Usage: node scripts/migration/import-payroll.js
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Validate required environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!SUPABASE_SERVICE_KEY) console.error("  - SUPABASE_SERVICE_KEY");
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read payroll export data
const payrollData = JSON.parse(
  fs.readFileSync("./data/exports/payroll-export.json", "utf8")
);

console.log("🚀 Starting payroll records migration...\n");

// Helper: Parse date from MM/DD/YYYY format
function parseDateString(dateStr) {
  if (!dateStr) return null;

  const [month, day, year] = dateStr.split("/");
  if (!month || !day || !year) return null;

  // Return YYYY-MM-DD format
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Helper: Extract employee_id from workerid
function extractEmployeeId(workerId) {
  if (!workerId) return null;

  // Format: "SG-001-844c9f7b" → "SG-001"
  const parts = workerId.split("-");
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return workerId;
}

async function importPayrollRecords() {
  try {
    // Step 1: Fetch worker mappings from Supabase
    console.log("📋 Fetching worker mappings from Supabase...");
    const { data: workers, error: workerError } = await supabase
      .from("workers")
      .select("id, employee_id");

    if (workerError) {
      throw new Error(`Failed to fetch workers: ${workerError.message}`);
    }

    // Create employee_id → UUID mapping
    const workerMap = new Map(workers.map((w) => [w.employee_id, w.id]));
    console.log(`✅ Loaded ${workerMap.size} worker mappings\n`);

    // Step 2: Transform payroll records
    console.log(`📊 Processing ${payrollData.length} payroll records...`);

    const transformedPayroll = [];
    const skippedRecords = [];

    for (let i = 0; i < payrollData.length; i++) {
      const record = payrollData[i];

      // Progress indicator
      if ((i + 1) % 50 === 0) {
        console.log(`   Processed ${i + 1}/${payrollData.length} records...`);
      }

      // Extract employee_id and map to UUID
      const employeeId = extractEmployeeId(record.workerid);
      const workerUUID = workerMap.get(employeeId);

      if (!workerUUID) {
        skippedRecords.push({
          lineitem_id: record.lineitemid,
          worker_id: record.workerid,
          reason: `Worker not found in Supabase (employee_id: ${employeeId})`,
        });
        continue;
      }

      // Parse dates
      const workDate = parseDateString(record.date);
      const weekPeriod = parseDateString(record.week_period);

      if (!workDate || !weekPeriod) {
        skippedRecords.push({
          lineitem_id: record.lineitemid,
          worker_id: record.workerid,
          reason: `Invalid date format: ${record.date} or ${record.week_period}`,
        });
        continue;
      }

      // Parse numbers
      const hours = parseFloat(record.qty) || 0;
      const amount = parseFloat(record.check_amount) || 0;

      transformedPayroll.push({
        worker_id: workerUUID,
        work_date: workDate,
        description: record.lineitemdetail || "No description",
        hours: hours,
        rate: hours > 0 ? amount / hours : 0, // Calculate rate from amount/hours
        amount: amount,
        week_period: weekPeriod,
        task_id: record.taskid || null,
        check_number: record.check_number || null,
        run_payroll:
          record.run_payroll === "TRUE" || record.run_payroll === true,
        status: "paid", // All historical records are paid
        created_at: new Date().toISOString(),
      });
    }

    console.log(`\n✅ Transformed ${transformedPayroll.length} records`);

    if (skippedRecords.length > 0) {
      console.log(`⚠️  Skipped ${skippedRecords.length} records:`);
      skippedRecords.slice(0, 5).forEach((skip) => {
        console.log(
          `   - ${skip.lineitem_id} (${skip.worker_id}): ${skip.reason}`
        );
      });
      if (skippedRecords.length > 5) {
        console.log(`   ... and ${skippedRecords.length - 5} more`);
      }
    }

    // Show sample transformation
    console.log("\n📝 Sample transformation (first record):");
    console.log("Source:", JSON.stringify(payrollData[0], null, 2));
    console.log("Target:", JSON.stringify(transformedPayroll[0], null, 2));

    // Step 3: Import to Supabase in batches
    console.log("\n💾 Importing to Supabase...");

    const BATCH_SIZE = 100;
    let importedCount = 0;

    for (let i = 0; i < transformedPayroll.length; i += BATCH_SIZE) {
      const batch = transformedPayroll.slice(i, i + BATCH_SIZE);

      const { error } = await supabase.from("payroll_line_items").insert(batch);

      if (error) {
        console.error(
          `\n❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
          error.message
        );
        console.error(
          "First record in failed batch:",
          JSON.stringify(batch[0], null, 2)
        );
        throw error;
      }

      importedCount += batch.length;
      console.log(
        `   Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          transformedPayroll.length / BATCH_SIZE
        )} (${importedCount} total)`
      );
    }

    console.log(
      `\n✅ Successfully imported ${importedCount} payroll records\n`
    );

    // Step 4: Verification
    const { count: totalCount } = await supabase
      .from("payroll_line_items")
      .select("*", { count: "exact", head: true });

    console.log("📊 Migration Verification:");
    console.log(`  Total payroll records in database: ${totalCount}\n`);

    // Top workers by payment
    const { data: topWorkers } = await supabase
      .from("payroll_line_items")
      .select("worker_id, worker:workers!worker_id(employee_id, display_name)")
      .limit(1000);

    if (topWorkers) {
      const workerTotals = topWorkers.reduce((acc, record) => {
        const empId = record.worker?.employee_id || "Unknown";
        acc[empId] = (acc[empId] || 0) + 1;
        return acc;
      }, {});

      const sorted = Object.entries(workerTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      console.log("  Top workers by payment records (sample):");
      sorted.forEach(([empId, count]) => {
        console.log(`    ${empId}: ${count} payments`);
      });
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

importPayrollRecords().catch(console.error);
