#!/usr/bin/env node

/**
 * Verify clock_ins table is using UUID primary key
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env.local"),
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verify() {
  console.log("🔍 Verifying clock_ins table structure...\n");

  try {
    // Test insert with UUID
    const { data, error } = await supabase
      .from("clock_ins")
      .insert({
        worker_id: "624652a2-830c-43d5-b76a-cfeff1c8270a",
        clock_in_time: new Date().toISOString(),
        latitude: 35.7796,
        longitude: -78.6382,
        distance_miles: 0.05,
        status: "pending",
        device: "Verification Test",
      })
      .select()
      .single();

    if (error) {
      console.log("❌ Insert failed:", error.message);
      console.log(
        "\n💡 Make sure migration 007 was run in Supabase Dashboard\n"
      );
      return;
    }

    console.log("✅ Test insert successful!\n");
    console.log("📊 Record details:");
    console.log(`   id: ${data.id}`);
    console.log(`   type: ${typeof data.id}`);

    // Check UUID format
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.id
      );

    if (isUUID) {
      console.log("   format: Valid UUID ✅\n");
      console.log("✅ PRIMARY KEY is now UUID (Best Practice)\n");
    } else {
      console.log(`   format: NOT UUID - got ${data.id} ❌\n`);
      console.log("❌ PRIMARY KEY is still INTEGER (anti-pattern)\n");
    }

    // Check record count
    const { count } = await supabase
      .from("clock_ins")
      .select("*", { count: "exact", head: true });

    console.log(`📈 Current record count: ${count}`);
    console.log("   Expected after re-import: 788\n");

    // Clean up test record
    await supabase.from("clock_ins").delete().eq("id", data.id);
    console.log("🧹 Test record cleaned up\n");

    if (isUUID && count === 1) {
      console.log("✅ Migration successful! Table is ready for data import.");
      console.log("\n📝 Next step:");
      console.log("   node scripts/migration/import-clockins.js\n");
    } else if (isUUID && count > 1) {
      console.log("⚠️  Table has UUID but already contains data.");
      console.log("   This is OK if you already re-imported.\n");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

verify().catch(console.error);
