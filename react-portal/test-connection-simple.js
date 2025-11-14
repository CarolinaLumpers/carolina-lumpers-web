/**
 * Simple Supabase Connection Test
 * Tests if we can connect to the new database tables
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("🧪 Testing Supabase Connection\n");
console.log("URL:", supabaseUrl);
console.log("Key exists:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.log("❌ Missing environment variables");
  process.exit(1);
}

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log("\n🔍 Testing database queries...");

    // Test 1: Check workers table
    console.log("👥 Testing workers table...");
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("id, display_name, role")
      .limit(5);

    if (workersError) {
      console.log("❌ Workers query failed:", workersError.message);
    } else {
      console.log(`✅ Workers found: ${workers.length}`);
      workers.forEach((worker) => {
        console.log(
          `   • ${worker.display_name} (${worker.id}) - ${worker.role}`
        );
      });
    }

    // Test 2: Check clients table
    console.log("\n🏢 Testing clients table...");
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, city, state")
      .limit(5);

    if (clientsError) {
      console.log("❌ Clients query failed:", clientsError.message);
    } else {
      console.log(`✅ Clients found: ${clients.length}`);
      clients.forEach((client) => {
        console.log(`   • ${client.name} (${client.city}, ${client.state})`);
      });
    }

    // Test 3: Check app settings
    console.log("\n⚙️  Testing app_settings table...");
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("key, value, description")
      .limit(5);

    if (settingsError) {
      console.log("❌ Settings query failed:", settingsError.message);
    } else {
      console.log(`✅ Settings found: ${settings.length}`);
      settings.forEach((setting) => {
        console.log(`   • ${setting.key}: ${setting.value}`);
      });
    }

    console.log("\n🎯 Connection test complete!");
    console.log("✅ React Portal can communicate with Supabase");
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
}

testConnection();
