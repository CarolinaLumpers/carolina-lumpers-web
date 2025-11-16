#!/usr/bin/env node

/**
 * Test script to determine if client_id is nullable and what type it expects
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env.local"),
});
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testClientIdField() {
  console.log("🔍 Testing clock_ins.client_id field...\n");

  // Test 1: Insert without client_id (check if nullable)
  console.log("Test 1: Insert without client_id");
  const { data: test1, error: error1 } = await supabase
    .from("clock_ins")
    .insert({
      worker_id: "b35e228f-9019-48c7-a75d-a4573e73de38",
      clock_in_time: "2025-11-15T12:00:00Z",
      latitude: 35.13,
      longitude: -80.73,
      distance_miles: 0.01,
      status: "completed",
      edit_status: "confirmed",
      notes: "Test without client_id",
      device: "Test",
      minutes_late: 0,
    })
    .select();

  if (error1) {
    console.log("❌ Error:", error1.message);
  } else {
    console.log("✅ SUCCESS! client_id is nullable");
    console.log("Record:", JSON.stringify(test1[0], null, 2));
  }

  console.log("\n---\n");

  // Test 2: Check if clients table exists and what format IDs are
  console.log("Test 2: Check clients table structure");
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .limit(3);

  if (clientError) {
    console.log("❌ Error accessing clients table:", clientError.message);
    console.log("💡 Recommendation: Set client_id to NULL for imports");
  } else {
    console.log("✅ Clients table exists!");
    console.log("Sample clients:", JSON.stringify(clients, null, 2));
    console.log("\n💡 Need to map client names → client IDs during import");
  }
}

testClientIdField().catch(console.error);
