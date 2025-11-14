/**
 * Supabase Connection Test
 * Run this to verify the database setup is working
 */

import { supabase } from "./src/services/supabase.js";

async function testSupabaseConnection() {
  console.log("🧪 Testing Supabase connection...");

  try {
    // Test 1: Check if we can connect to Supabase
    const { data, error } = await supabase
      .from("workers")
      .select("count(*)")
      .single();

    if (error) {
      console.error("❌ Connection failed:", error.message);
      return false;
    }

    console.log("✅ Database connection successful");

    // Test 2: Check if tables exist
    const tables = ["workers", "clock_ins", "clients"];
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select("*")
          .limit(1);

        if (tableError) {
          console.error(
            `❌ Table '${table}' not accessible:`,
            tableError.message
          );
        } else {
          console.log(`✅ Table '${table}' accessible`);
        }
      } catch (e) {
        console.error(`❌ Error testing table '${table}':`, e.message);
      }
    }

    // Test 3: Check if we can read clients (should have test data)
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*");

    if (clientsError) {
      console.error("❌ Cannot read clients:", clientsError.message);
    } else {
      console.log(`✅ Found ${clients?.length || 0} clients in database`);
      if (clients?.length > 0) {
        console.log("📍 Test clients:", clients.map((c) => c.name).join(", "));
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

// Run the test
testSupabaseConnection()
  .then((success) => {
    if (success) {
      console.log(
        "🎉 Supabase setup is working! Ready for React Portal integration."
      );
    } else {
      console.log("⚠️ Setup issues detected. Check the errors above.");
    }
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error.message);
  });
