/**
 * Sync Workers from Google Sheets to Supabase
 * 
 * This script:
 * 1. Fetches all workers from Google Sheets Workers tab
 * 2. Compares with existing Supabase workers
 * 3. Adds missing workers with Supabase Auth accounts
 * 4. Optionally updates existing workers (if --update flag provided)
 * 
 * Usage:
 *   node sync-workers-from-sheets.js           # Dry run (show what would be added)
 *   node sync-workers-from-sheets.js --execute # Actually add missing workers
 *   node sync-workers-from-sheets.js --update  # Add missing + update existing
 */

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SPREADSHEET_ID = "1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk";
const SHEET_NAME = "Workers";

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute") && !args.includes("--update");
const UPDATE_EXISTING = args.includes("--update");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Map Google Sheets column names to our schema
 * Actual Sheets columns:
 * A: WorkerID, B: Employee ID, C: First Name, D: Last Name, E: Email, F: Phone,
 * G: Role, H: ServiceItem, I: Hourly Rate, J: Flat Rate Bonus, K: Availability,
 * L: App Access, M: ApplicationID, N: Primary Language, O: Work History,
 * P: Photo, Q: Docs, R: Column 1, S: Display Name, T: QBOID, U: Send Report,
 * V: PasswordHash, W: W9Status, X: W9SubmittedDate, Y: W9ApprovedDate, Z: W9ApprovedBy
 */
function parseWorkerFromSheets(row, headers) {
  const record = {};
  headers.forEach((header, index) => {
    record[header] = row[index] || "";
  });

  // Map language codes
  let language = "en"; // default
  if (record["Primary Language"]) {
    const lang = record["Primary Language"].toLowerCase();
    if (lang.includes("spanish") || lang.includes("español")) language = "es";
    else if (lang.includes("portuguese") || lang.includes("português"))
      language = "pt";
  }

  // Map W9 status
  let w9Status = "pending";
  if (record.W9Status) {
    w9Status = record.W9Status.toLowerCase();
  }

  // Determine role from App Access column or Role number
  let role = "Worker"; // default
  if (record["App Access"]) {
    const access = record["App Access"].toLowerCase();
    if (access === "admin") role = "Admin";
    else if (access === "supervisor" || access === "lead") role = "Supervisor";
  } else if (record.Role === "1") {
    role = "Admin";
  } else if (record.Role === "2") {
    role = "Supervisor";
  }

  // Determine active status from Availability column
  const isActive = record.Availability?.toLowerCase() === "active";

  return {
    employee_id: record["Employee ID"], // e.g., "SG-001", "YBQp-043"
    display_name: record["Display Name"] || `${record["First Name"]} ${record["Last Name"]}`.trim(),
    email: record.Email?.toLowerCase().trim(),
    phone: record.Phone?.replace(/\D/g, ""), // Remove non-digits
    role: role,
    hourly_rate: parseFloat(record["Hourly Rate"]) || 15.0,
    w9_status: w9Status,
    language: language,
    is_active: isActive,
    notes: record["Work History"] || null,
    // Store legacy WorkerID (with hash) for reference if needed
    legacy_full_id: record.WorkerID,
  };
}

async function fetchWorkersFromSheets() {
  console.log("📋 Fetching workers from Google Sheets...\n");

  const serviceAccountPath = "./server/service-account-key.json";
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      "❌ Service account key not found at: " + serviceAccountPath
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    throw new Error("No data found in Workers sheet");
  }

  const headers = rows[0];
  const workers = rows
    .slice(1)
    .map((row) => {
      try {
        return parseWorkerFromSheets(row, headers);
      } catch (error) {
        console.warn(
          `⚠️  Failed to parse row: ${row[0] || "unknown"}`,
          error.message
        );
        return null;
      }
    })
    .filter(
      (w) => w && w.employee_id && w.email && w.email.includes("@") // Valid workers only
    );

  console.log(`✅ Fetched ${workers.length} valid workers from Sheets\n`);
  return workers;
}

async function fetchWorkersFromSupabase() {
  console.log("🔍 Fetching existing workers from Supabase...\n");

  const { data: workers, error } = await supabase
    .from("workers")
    .select("id, employee_id, display_name, email, phone, role, hourly_rate, w9_status, language, is_active, notes");

  if (error) {
    throw new Error("Failed to fetch Supabase workers: " + error.message);
  }

  console.log(`✅ Found ${workers.length} workers in Supabase\n`);
  return workers;
}

function compareWorkers(sheetsWorker, supabaseWorker) {
  const changes = [];

  if (sheetsWorker.display_name !== supabaseWorker.display_name)
    changes.push(`name: "${supabaseWorker.display_name}" → "${sheetsWorker.display_name}"`);
  
  if (sheetsWorker.email !== supabaseWorker.email)
    changes.push(`email: "${supabaseWorker.email}" → "${sheetsWorker.email}"`);
  
  if (sheetsWorker.phone !== supabaseWorker.phone)
    changes.push(`phone: "${supabaseWorker.phone}" → "${sheetsWorker.phone}"`);
  
  if (sheetsWorker.role !== supabaseWorker.role)
    changes.push(`role: "${supabaseWorker.role}" → "${sheetsWorker.role}"`);
  
  if (sheetsWorker.hourly_rate !== supabaseWorker.hourly_rate)
    changes.push(`rate: $${supabaseWorker.hourly_rate} → $${sheetsWorker.hourly_rate}`);
  
  if (sheetsWorker.w9_status !== supabaseWorker.w9_status)
    changes.push(`w9: "${supabaseWorker.w9_status}" → "${sheetsWorker.w9_status}"`);
  
  if (sheetsWorker.language !== supabaseWorker.language)
    changes.push(`lang: "${supabaseWorker.language}" → "${sheetsWorker.language}"`);
  
  if (sheetsWorker.is_active !== supabaseWorker.is_active)
    changes.push(`active: ${supabaseWorker.is_active} → ${sheetsWorker.is_active}`);

  return changes;
}

async function createWorkerWithAuth(worker) {
  // Step 1: Create Supabase Auth account
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: worker.email,
    password: "Carolina2025!", // Temporary password
    email_confirm: true,
    user_metadata: {
      display_name: worker.display_name,
      employee_id: worker.employee_id,
      force_password_change: true,
    },
  });

  if (authError) {
    // Check if user already exists
    if (authError.message.includes("already registered")) {
      console.log(`   ⚠️  Auth account already exists for ${worker.email}, fetching...`);
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find((u) => u.email === worker.email);
      
      if (existingUser) {
        worker.id = existingUser.id;
      } else {
        throw new Error(`Auth account exists but cannot be found for ${worker.email}`);
      }
    } else {
      throw authError;
    }
  } else {
    worker.id = authData.user.id;
  }

  // Step 2: Insert into workers table
  const { data: workerData, error: workerError } = await supabase
    .from("workers")
    .insert([worker])
    .select()
    .single();

  if (workerError) {
    throw new Error(`Failed to insert worker: ${workerError.message}`);
  }

  return workerData;
}

async function updateWorker(workerId, updates) {
  const { data, error } = await supabase
    .from("workers")
    .update(updates)
    .eq("id", workerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update worker: ${error.message}`);
  }

  return data;
}

async function syncWorkers() {
  console.log("🔄 Carolina Lumpers - Worker Sync Tool\n");
  console.log("=" .repeat(60));
  
  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log("   Use --execute to actually add missing workers");
    console.log("   Use --update to add missing + update existing workers");
  } else if (UPDATE_EXISTING) {
    console.log("⚡ UPDATE MODE - Will add missing and update existing workers");
  } else {
    console.log("✅ EXECUTE MODE - Will add missing workers only");
  }
  
  console.log("=" .repeat(60) + "\n");

  // Fetch data from both sources
  const sheetsWorkers = await fetchWorkersFromSheets();
  const supabaseWorkers = await fetchWorkersFromSupabase();

  // Create lookup map
  const supabaseMap = new Map(
    supabaseWorkers.map((w) => [w.employee_id, w])
  );

  // Identify missing and changed workers
  const missingWorkers = [];
  const changedWorkers = [];

  for (const sheetsWorker of sheetsWorkers) {
    const existingWorker = supabaseMap.get(sheetsWorker.employee_id);

    if (!existingWorker) {
      missingWorkers.push(sheetsWorker);
    } else if (UPDATE_EXISTING) {
      const changes = compareWorkers(sheetsWorker, existingWorker);
      if (changes.length > 0) {
        changedWorkers.push({
          worker: sheetsWorker,
          existing: existingWorker,
          changes: changes,
        });
      }
    }
  }

  // Report findings
  console.log("📊 Sync Analysis:");
  console.log(`   Total in Sheets: ${sheetsWorkers.length}`);
  console.log(`   Total in Supabase: ${supabaseWorkers.length}`);
  console.log(`   Missing in Supabase: ${missingWorkers.length}`);
  console.log(`   Changed (if updating): ${changedWorkers.length}\n`);

  // Display missing workers
  if (missingWorkers.length > 0) {
    console.log("➕ Missing Workers (need to be added):");
    missingWorkers.forEach((w, i) => {
      console.log(
        `   ${i + 1}. ${w.employee_id} - ${w.display_name} (${w.email}) [${w.role}, $${w.hourly_rate}/hr]`
      );
    });
    console.log("");
  }

  // Display changed workers
  if (changedWorkers.length > 0 && UPDATE_EXISTING) {
    console.log("🔄 Changed Workers (need updates):");
    changedWorkers.forEach((item, i) => {
      console.log(
        `   ${i + 1}. ${item.worker.employee_id} - ${item.worker.display_name}`
      );
      item.changes.forEach((change) => console.log(`      • ${change}`));
    });
    console.log("");
  }

  // Exit if dry run
  if (DRY_RUN) {
    console.log("✅ Dry run complete. Use --execute to apply changes.\n");
    return;
  }

  // Execute sync
  let addedCount = 0;
  let updatedCount = 0;
  const errors = [];

  // Add missing workers
  if (missingWorkers.length > 0) {
    console.log("➕ Adding missing workers...\n");

    for (const worker of missingWorkers) {
      try {
        const created = await createWorkerWithAuth(worker);
        addedCount++;
        console.log(
          `   ✅ Added: ${worker.employee_id} - ${worker.display_name} (UUID: ${created.id.substring(0, 8)}...)`
        );
      } catch (error) {
        errors.push({
          worker: worker.employee_id,
          error: error.message,
        });
        console.error(`   ❌ Failed: ${worker.employee_id} - ${error.message}`);
      }
    }
    console.log("");
  }

  // Update changed workers
  if (changedWorkers.length > 0 && UPDATE_EXISTING) {
    console.log("🔄 Updating changed workers...\n");

    for (const item of changedWorkers) {
      try {
        const updates = {
          display_name: item.worker.display_name,
          email: item.worker.email,
          phone: item.worker.phone,
          role: item.worker.role,
          hourly_rate: item.worker.hourly_rate,
          w9_status: item.worker.w9_status,
          language: item.worker.language,
          is_active: item.worker.is_active,
          notes: item.worker.notes,
          updated_at: new Date().toISOString(),
        };

        await updateWorker(item.existing.id, updates);
        updatedCount++;
        console.log(`   ✅ Updated: ${item.worker.employee_id} - ${item.worker.display_name}`);
        item.changes.forEach((change) => console.log(`      • ${change}`));
      } catch (error) {
        errors.push({
          worker: item.worker.employee_id,
          error: error.message,
        });
        console.error(`   ❌ Failed: ${item.worker.employee_id} - ${error.message}`);
      }
    }
    console.log("");
  }

  // Final summary
  console.log("=" .repeat(60));
  console.log("📊 Sync Summary:");
  console.log(`   ✅ Workers added: ${addedCount}`);
  console.log(`   🔄 Workers updated: ${updatedCount}`);
  console.log(`   ❌ Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log("\n❌ Errors encountered:");
    errors.forEach((e) => {
      console.log(`   • ${e.worker}: ${e.error}`);
    });
  }
  
  console.log("=" .repeat(60) + "\n");

  // Verify final count
  const { data: finalWorkers } = await supabase
    .from("workers")
    .select("employee_id", { count: "exact", head: true });

  console.log(`✅ Sync complete! Total workers in Supabase: ${finalWorkers || supabaseWorkers.length + addedCount}\n`);
}

// Run the sync
syncWorkers().catch((error) => {
  console.error("💥 Fatal error:", error.message);
  console.error(error.stack);
  process.exit(1);
});
