#!/usr/bin/env node

/**
 * Inspect actual clock_ins table schema in Supabase
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env.local"),
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function inspectSchema() {
  console.log("🔍 Inspecting clock_ins table schema...\n");

  // Get a sample record to see all fields
  const { data, error } = await supabase.from("clock_ins").select("*").limit(1);

  if (error) {
    console.log("❌ Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log(
      "⚠️  No records found. Let me try to insert a test record...\n"
    );

    // Try different status values
    const statusValues = ["pending", "active", "confirmed", "completed"];

    for (const status of statusValues) {
      console.log(`Testing status="${status}"...`);
      const { data: testData, error: testError } = await supabase
        .from("clock_ins")
        .insert({
          worker_id: "b35e228f-9019-48c7-a75d-a4573e73de38",
          clock_in_time: "2025-11-15T12:00:00Z",
          latitude: 35.13,
          longitude: -80.73,
          distance_miles: 0.01,
          status: status,
          edit_status: "confirmed",
          minutes_late: 0,
        })
        .select();

      if (testError) {
        console.log(`  ❌ Failed: ${testError.message}\n`);
      } else {
        console.log(`  ✅ SUCCESS with status="${status}"`);
        console.log("\n📋 Actual Table Columns:");
        Object.keys(testData[0]).forEach((key) => {
          const value = testData[0][key];
          const type = typeof value;
          console.log(`  ${key.padEnd(20)} ${type.padEnd(10)} = ${value}`);
        });

        // Clean up test record
        await supabase.from("clock_ins").delete().eq("id", testData[0].id);
        return;
      }
    }
  } else {
    console.log("📋 Actual Table Columns:");
    Object.keys(data[0]).forEach((key) => {
      const value = data[0][key];
      const type = typeof value;
      console.log(`  ${key.padEnd(20)} ${type.padEnd(10)} = ${value}`);
    });
  }
}

inspectSchema().catch(console.error);
