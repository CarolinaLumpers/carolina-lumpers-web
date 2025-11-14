/**
 * Test Supabase with Service Key
 * Uses admin service key to verify database access
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY; // Admin key

console.log("🔧 Testing Supabase with Service Key\n");

// Create client with service key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceKey);

async function testWithServiceKey() {
  try {
    console.log("🔍 Testing database with admin privileges...");

    // Test workers table
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("*");

    if (workersError) {
      console.log("❌ Workers query failed:", workersError.message);
      return;
    }

    console.log(`✅ Workers table: ${workers.length} records`);
    workers.forEach((worker) => {
      console.log(
        `   • ${worker.display_name} (${worker.id}) - ${worker.role}`
      );
    });

    // Test clients table
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*");

    if (!clientsError) {
      console.log(`✅ Clients table: ${clients.length} records`);
      clients.forEach((client) => {
        console.log(`   • ${client.name}`);
      });
    }

    // Test app settings
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("*");

    if (!settingsError) {
      console.log(`✅ Settings table: ${settings.length} records`);
      settings.forEach((setting) => {
        console.log(`   • ${setting.key}: ${setting.value}`);
      });
    }

    console.log("\n🎯 Service key test successful!");
    console.log("💡 Issue: Need to disable RLS or get fresh anon key");
  } catch (error) {
    console.log("❌ Service key test failed:", error.message);
  }
}

testWithServiceKey();
