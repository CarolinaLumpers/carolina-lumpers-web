/**
 * Test Proper Supabase Authentication
 * Verifies the full auth flow with linked worker profile
 */

import dotenv from "dotenv";
import { supabaseApi } from "./src/services/supabase.js";

dotenv.config({ path: ".env.local" });

async function testProperAuth() {
  console.log("🔐 Testing Proper Supabase Authentication\n");

  const email = "s.garay@carolinalumpers.com";
  const password = "Carolina2025!";

  try {
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("🔄 Attempting Supabase login...\n");

    const result = await supabaseApi.signIn(email, password);

    console.log("✅ Login successful!");
    console.log("🔐 Auth User:", result.user.id);
    console.log("👤 Worker Profile:");
    console.log(`   • Worker ID: ${result.worker.id}`);
    console.log(`   • Name: ${result.worker.display_name}`);
    console.log(`   • Email: ${result.worker.email}`);
    console.log(`   • Role: ${result.worker.role}`);
    console.log(`   • Auth Link: ${result.worker.auth_user_id}`);
    console.log(`   • W9 Status: ${result.worker.w9_status}`);

    console.log("\n🎯 Ready for React Portal login!");
    console.log("📝 Use these credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("   URL: http://localhost:5173/");
  } catch (error) {
    console.log("❌ Authentication failed:", error.message);
    if (error.code) console.log("   Code:", error.code);
  }
}

testProperAuth();
