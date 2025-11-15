/**
 * Add Nataly Quigla (NQ-044) to Supabase workers table
 * She was missing from Phase 1 migration but has a W9 submission
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addNataly() {
  console.log("🔍 Adding Nataly Quigla (NQ-044) to workers table...\n");

  // From Google Sheets Workers tab:
  // NQ-044-7c4d1a33	NQ-044	Nataly	Quigla	natalyquigla@icloud.com	6147973797	1		18		Active		c5e601ff-24d6-4e3c-8b1f-405cf2c60849	Spanish	6–12 months: Disponiblida

  const natalyData = {
    employee_id: "NQ-044",
    display_name: "Nataly Quigla",
    email: "natalyquigla@icloud.com",
    phone: "6147973797",
    role: "Worker",
    hourly_rate: 18.0,
    w9_status: "approved", // She has W9-009 approved
    language: "es", // Spanish
    is_active: true,
    notes: "Added post-Phase 1 migration to link W9-009",
  };

  console.log("📋 Worker data to insert:");
  console.log(JSON.stringify(natalyData, null, 2));

  // Step 1: Create Supabase Auth account
  console.log("\n🔐 Creating Supabase Auth account...");
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: natalyData.email,
      password: "Carolina2025!", // Temporary password
      email_confirm: true,
      user_metadata: {
        display_name: natalyData.display_name,
        employee_id: natalyData.employee_id,
        force_password_change: true,
      },
    });

  if (authError) {
    console.error("❌ Auth creation failed:", authError.message);
    // Check if user already exists
    if (authError.message.includes("already registered")) {
      console.log(
        "⚠️  User already exists in Auth. Fetching existing user..."
      );
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(
        (u) => u.email === natalyData.email
      );
      if (existingUser) {
        console.log("✅ Found existing auth user:", existingUser.id);
        natalyData.id = existingUser.id; // Use existing auth ID
      } else {
        console.error("❌ Could not find existing user");
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } else {
    console.log("✅ Auth account created:", authData.user.id);
    natalyData.id = authData.user.id; // UUID from Supabase Auth
  }

  // Step 2: Insert into workers table
  console.log("\n💾 Inserting into workers table...");
  const { data: workerData, error: workerError } = await supabase
    .from("workers")
    .insert([natalyData])
    .select()
    .single();

  if (workerError) {
    console.error("❌ Worker insertion failed:", workerError.message);
    console.error("Details:", workerError);
    process.exit(1);
  }

  console.log("✅ Worker created successfully!");
  console.log("   UUID:", workerData.id);
  console.log("   Employee ID:", workerData.employee_id);
  console.log("   Name:", workerData.display_name);

  // Step 3: Update W9 submission to link to this worker
  console.log("\n🔗 Linking W9-009 to Nataly's UUID...");
  const { data: w9Data, error: w9Error } = await supabase
    .from("w9_submissions")
    .update({ worker_id: workerData.id })
    .eq("w9_record_id", "W9-009")
    .select();

  if (w9Error) {
    console.error("⚠️  Could not link W9:", w9Error.message);
    console.log(
      "   You may need to manually insert W9-009 or run import-w9-submissions.js again"
    );
  } else if (w9Data && w9Data.length > 0) {
    console.log("✅ W9-009 linked successfully!");
  } else {
    console.log(
      "⚠️  W9-009 not found in database. Run import-w9-submissions.js to add it."
    );
  }

  // Step 4: Verify
  console.log("\n🔍 Verification:");
  const { data: allWorkers } = await supabase
    .from("workers")
    .select("employee_id, display_name")
    .order("employee_id");

  console.log(`   Total workers: ${allWorkers.length}`);
  console.log(
    "   Nataly exists:",
    allWorkers.some((w) => w.employee_id === "NQ-044") ? "✅ YES" : "❌ NO"
  );

  const { data: w9Count } = await supabase
    .from("w9_submissions")
    .select("w9_record_id", { count: "exact", head: true });

  console.log(`   Total W9 submissions: ${w9Count}`);

  console.log("\n✅ Nataly Quigla added successfully!");
}

addNataly().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
