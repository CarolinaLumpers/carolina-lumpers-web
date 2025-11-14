#!/usr/bin/env node

/**
 * Test Supabase getAllWorkersWithClockIns method
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase configuration in .env.local");
  process.exit(1);
}

// Create Supabase client directly
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseWorkers() {
  try {
    console.log("🧪 Testing Supabase getAllWorkersWithClockIns method...\n");

    // Get today's date range for filtering clock-ins
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    ).toISOString();

    // Fetch workers and today's clock-ins in parallel
    const [workersResult, clockInsResult] = await Promise.all([
      supabase
        .from("workers")
        .select("*")
        .eq("is_active", true)
        .order("display_name"),
      supabase
        .from("clock_ins")
        .select(
          `
          *,
          workers!inner(display_name)
        `
        )
        .gte("clock_in_time", todayStart)
        .lt("clock_in_time", todayEnd)
        .order("clock_in_time", { ascending: false }),
    ]);

    if (workersResult.error) throw workersResult.error;
    if (clockInsResult.error) throw clockInsResult.error;

    const workers = workersResult.data || [];
    const clockIns = clockInsResult.data || [];

    console.log("✅ Success! Retrieved workers data:");
    console.log(`📊 Workers: ${workers.length}`);
    console.log(`📋 Clock-ins today: ${clockIns.length}\n`);

    // Show sample workers
    console.log("👥 Workers sample:");
    workers.slice(0, 3).forEach((worker) => {
      const workerClockIns = clockIns.filter(
        (ci) => ci.worker_id === worker.id
      );
      console.log(
        `  ${worker.id}: ${worker.display_name} (${worker.role}) - ${workerClockIns.length} clock-ins today`
      );
    });

    // Show role distribution
    const roleCount = workers.reduce((acc, w) => {
      acc[w.role] = (acc[w.role] || 0) + 1;
      return acc;
    }, {});

    console.log("\n🏷️  Role distribution:");
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    console.log("\n✅ Supabase API working correctly!");
  } catch (error) {
    console.error("❌ Error testing Supabase API:", error);
    process.exit(1);
  }
}

testSupabaseWorkers();
