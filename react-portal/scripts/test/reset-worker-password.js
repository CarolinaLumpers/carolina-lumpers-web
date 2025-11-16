/**
 * Reset Worker Password for Testing
 * Uses Supabase Admin API to set known password for development testing
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   VITE_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error(
    "   SUPABASE_SERVICE_ROLE_KEY:",
    supabaseServiceKey ? "✓" : "✗"
  );
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword(email, newPassword) {
  console.log(`\n🔐 Resetting password for: ${email}`);
  console.log(`📝 New password: ${newPassword}\n`);

  try {
    // Get auth user ID from auth.users
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error listing users:", listError.message);
      return;
    }

    const authUser = users.find((u) => u.email === email);
    if (!authUser) {
      console.error("❌ No auth user found with that email");
      return;
    }

    // Get worker details
    const { data: userData, error: userError } = await supabase
      .from("workers")
      .select("employee_id, display_name, email, role")
      .eq("email", email)
      .single();

    if (userError) {
      console.error("❌ Error finding worker:", userError.message);
      return;
    }

    console.log("👤 Worker Details:");
    console.log(`   ID: ${userData.employee_id}`);
    console.log(`   Name: ${userData.display_name}`);
    console.log(`   Role: ${userData.role}`);
    console.log("");

    // Update password using Admin API with correct auth user ID
    const { data: authData, error: authError } =
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
      });

    if (authError) {
      console.error("❌ Error updating password:", authError.message);
      return;
    }

    console.log("✅ Password updated successfully!");
    console.log("\n📋 Login Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   URL: http://localhost:5173/login`);
    console.log("");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

// Run with command line arguments or defaults
const email = process.argv[2] || "albertjgarciav@gmail.com";
const password = process.argv[3] || "test123";

resetPassword(email, password);
