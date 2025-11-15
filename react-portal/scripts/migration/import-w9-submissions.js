import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Validate required environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY)
    console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Read W9 export data
const w9Data = JSON.parse(fs.readFileSync("./w9-records-export.json", "utf-8"));

// Parse date string "11/11/2025 7:58:41" to ISO timestamp
function parseSheetDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;
  const parts = dateStr.split(" ");
  if (parts.length < 2) return null;

  const [datePart, timePart] = parts;
  const [month, day, year] = datePart.split("/");
  const [hours, minutes, seconds] = timePart
    ? timePart.split(":")
    : ["0", "0", "0"];

  // Create date in EST timezone
  const date = new Date(
    year,
    month - 1,
    day,
    hours || 0,
    minutes || 0,
    seconds || 0
  );
  return date.toISOString();
}

// Transform Google Sheets record to Supabase schema
function transformW9Record(record) {
  return {
    worker_id: record.WorkerID,
    w9_record_id: record.W9RecordID,
    legal_name: record.LegalName,
    business_name: record.BusinessName || null,
    tax_classification: record.TaxClassification,
    address: record.Address,
    city: record.City || null,
    state: record.State || null,
    zip: record.ZIP || null,
    ssn_encrypted: record.SSN_Encrypted || null,
    ssn_last4: record.SSN_Last4 || null,
    backup_withholding: record.BackupWithholding === "YES",
    pdf_url: record.W9_PDF_URL || null,
    status: record.Status.toLowerCase(), // "approved" -> "approved"
    submitted_date: parseSheetDate(record.SubmissionDate),
    reviewed_date: record.ApprovedDate
      ? parseSheetDate(record.ApprovedDate)
      : null,
    reviewed_by: record.ApprovedBy || null,
    rejection_reason: record.RejectionReason || null,
    admin_notes: record.AdminNotes || null,
  };
}

async function importW9Records() {
  console.log("🚀 Starting W9 records migration...\n");

  // Fetch all workers to validate IDs exist and create mapping
  console.log("📋 Fetching worker mappings from Supabase...");
  const { data: workers, error: workersError } = await supabase
    .from("workers")
    .select("id, employee_id"); // UUID and legacy text ID

  if (workersError) {
    console.error("❌ Failed to fetch workers:", workersError.message);
    process.exit(1);
  }

  // Create map: employee_id -> UUID
  const workerIdMap = new Map(workers.map((w) => [w.employee_id, w.id]));

  console.log(`✅ Loaded ${workers.length} worker mappings\n`);

  // Transform all records - map employee_id to UUID
  const transformedRecords = w9Data.records
    .map((record) => {
      // Strip hash suffix from WorkerID (e.g., "YBQp-043-7868a066" -> "YBQp-043")
      const cleanWorkerId = record.WorkerID.split("-").slice(0, 2).join("-");
      const cleanReviewerId = record.ApprovedBy
        ? record.ApprovedBy.split("-").slice(0, 2).join("-")
        : null;

      // Look up UUID from employee_id
      const workerUuid = workerIdMap.get(cleanWorkerId);
      const reviewerUuid = cleanReviewerId
        ? workerIdMap.get(cleanReviewerId)
        : null;

      if (!workerUuid) {
        console.warn(
          `⚠️  Worker ${record.WorkerID} (employee_id: ${cleanWorkerId}) not found in workers table, skipping record ${record.W9RecordID}`
        );
        return null;
      }

      return {
        worker_id: workerUuid, // UUID foreign key to workers.id
        w9_record_id: record.W9RecordID,
        legal_name: record.LegalName,
        business_name: record.BusinessName || null,
        tax_classification: record.TaxClassification,
        address: record.Address,
        city: record.City || null,
        state: record.State || null,
        zip: record.ZIP || null,
        ssn_encrypted: record.SSN_Encrypted || null,
        ssn_last4: record.SSN_Last4 || null,
        backup_withholding: record.BackupWithholding === "TRUE",
        pdf_url: record.W9_PDF_URL || null,
        status: record.Status.toLowerCase(),
        submitted_date: parseSheetDate(record.SubmissionDate),
        reviewed_date: record.ApprovedDate
          ? parseSheetDate(record.ApprovedDate)
          : null,
        reviewed_by: reviewerUuid, // UUID foreign key (nullable)
        rejection_reason: record.RejectionReason || null,
        admin_notes: record.AdminNotes || null,
      };
    })
    .filter(Boolean); // Remove null entries (workers not found)

  console.log(
    `📊 Migrating ${transformedRecords.length} W9 records from Google Sheets\n`
  );

  // Display sample transformation
  console.log("📝 Sample transformation (first record):");
  console.log("  Source:", {
    WorkerID: w9Data.records[0].WorkerID,
    W9RecordID: w9Data.records[0].W9RecordID,
    LegalName: w9Data.records[0].LegalName,
    Status: w9Data.records[0].Status,
  });
  console.log("  Target:", {
    worker_id: transformedRecords[0].worker_id,
    w9_record_id: transformedRecords[0].w9_record_id,
    legal_name: transformedRecords[0].legal_name,
    status: transformedRecords[0].status,
  });
  console.log("");

  // Insert records with upsert (conflict handling)
  const { data, error } = await supabase
    .from("w9_submissions")
    .upsert(transformedRecords, {
      onConflict: "w9_record_id",
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Details:", error.details);
    process.exit(1);
  }

  console.log(`✅ Successfully migrated ${data.length} W9 records\n`);

  // Verify migration with status breakdown
  const { data: allRecords, error: queryError } = await supabase
    .from("w9_submissions")
    .select("worker_id, w9_record_id, legal_name, status, submitted_date")
    .order("submitted_date", { ascending: false });

  if (queryError) {
    console.error("⚠️  Could not verify records:", queryError.message);
  } else {
    console.log("📊 Migration Verification:");
    console.log(`  Total records: ${allRecords.length}`);

    // Status breakdown
    const statusCounts = allRecords.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    console.log("  Status breakdown:", statusCounts);
    console.log("\n  All records:");
    allRecords.forEach((r, i) => {
      console.log(
        `    ${i + 1}. ${r.w9_record_id} - ${r.legal_name} (${r.status})`
      );
    });
  }

  // Test RLS policies (query as service role should work)
  const { count: totalCount } = await supabase
    .from("w9_submissions")
    .select("*", { count: "exact", head: true });

  console.log(`\n🔒 RLS Test (service role): ${totalCount} records accessible`);

  console.log("\n✅ Phase 2 W9 migration complete!");
}

// Run migration
importW9Records().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
