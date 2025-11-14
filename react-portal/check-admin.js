/**
 * Check Admin User Details
 * Shows what admin accounts are available for login
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAdminUsers() {
  console.log("🔍 Checking available admin users...\n");

  try {
    const { data: admins, error } = await supabase
      .from("workers")
      .select("*")
      .eq("role", "Admin");

    if (error) {
      console.log("❌ Error:", error.message);
      return;
    }

    console.log(`👥 Found ${admins.length} admin user(s):`);
    admins.forEach((admin) => {
      console.log(`\n📋 Admin User Details:`);
      console.log(`   • ID: ${admin.id}`);
      console.log(`   • Name: ${admin.display_name}`);
      console.log(`   • Email: ${admin.email}`);
      console.log(`   • Role: ${admin.role}`);
      console.log(`   • Active: ${admin.is_active}`);
      console.log(`   • Language: ${admin.language}`);
    });

    console.log(`\n🔑 To log in:`);
    console.log(`   1. Open: http://localhost:5173/`);
    console.log(`   2. Use email: ${admins[0]?.email}`);
    console.log(`   3. Password: (Need to check legacy system or set up auth)`);

    // Check if Supabase Auth is being used
    console.log(`\n💡 Authentication Method:`);
    console.log(`   Current: Database table lookup (legacy style)`);
    console.log(`   Recommended: Supabase Auth (built-in authentication)`);
  } catch (error) {
    console.log("❌ Error checking users:", error.message);
  }
}

checkAdminUsers();
