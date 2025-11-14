/**
 * Simple Supabase Setup using REST API
 * Creates tables using direct HTTP calls
 */

// Load environment variables (ES modules)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = "https://dxbybjxpglpslmoenqyg.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || "ADD_YOUR_SERVICE_KEY_HERE";

async function executSQL(sql, description) {
  console.log(`🔧 ${description}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      console.log(`✅ ${description} completed`);
      return true;
    } else {
      const error = await response.text();
      console.log(`⚠️ ${description}: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️ ${description}: ${error.message}`);
    return false;
  }
}

async function createTables() {
  console.log("🏗️ Creating database tables via REST API...\n");

  // Simple approach: Create one table at a time using insert operations
  const tables = [
    {
      name: "clients",
      sql: `
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude DECIMAL(10,7),
          longitude DECIMAL(10,7),
          geofence_radius_miles DECIMAL(4,2) DEFAULT 0.3,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    },
    {
      name: "workers",
      sql: `
        CREATE TABLE IF NOT EXISTS workers (
          id TEXT PRIMARY KEY,
          employee_id TEXT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          role TEXT,
          app_access TEXT,
          hourly_rate DECIMAL(5,2),
          availability TEXT DEFAULT 'Active',
          primary_language TEXT DEFAULT 'en',
          w9_status TEXT DEFAULT 'none',
          auth_user_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    },
  ];

  let success = 0;
  for (const table of tables) {
    const result = await executSQL(table.sql, `Create ${table.name} table`);
    if (result) success++;
  }

  return success;
}

async function insertTestData() {
  console.log("\n🧪 Inserting test data...");

  try {
    // Insert test clients using Supabase REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          id: "TEST_CLIENT",
          name: "Test Location",
          address: "123 Test St, Raleigh NC",
          latitude: 35.7796,
          longitude: -78.6382,
        },
        {
          id: "OFFICE_HQ",
          name: "Carolina Lumpers HQ",
          address: "456 Main St, Raleigh NC",
          latitude: 35.7897,
          longitude: -78.6569,
        },
      ]),
    });

    if (response.ok) {
      console.log("✅ Test clients inserted");
      return true;
    } else {
      const error = await response.text();
      console.log(`⚠️ Insert test data: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️ Insert test data failed: ${error.message}`);
    return false;
  }
}

async function testConnection() {
  console.log("🧪 Testing Supabase connection...\n");

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?select=count`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );

    if (response.ok) {
      console.log("✅ Connection successful");
      return true;
    } else {
      console.log("❌ Connection failed:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ Connection error:", error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🚀 CLS Supabase Database Setup\n");

  if (!SERVICE_KEY || SERVICE_KEY === "ADD_YOUR_SERVICE_KEY_HERE") {
    console.log("❌ Please add your SUPABASE_SERVICE_KEY to .env.local");
    console.log(
      "📝 Get it from: https://dxbybjxpglpslmoenqyg.supabase.co/project/dxbybjxpglpslmoenqyg/settings/api"
    );
    return;
  }

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log("💡 Please check your service key and try again.");
    return;
  }

  // Create tables
  const tablesCreated = await createTables();

  // Insert test data
  if (tablesCreated > 0) {
    await insertTestData();
  }

  console.log("\n🎯 Next Steps:");
  console.log(
    "1. Check your Supabase dashboard: https://dxbybjxpglpslmoenqyg.supabase.co"
  );
  console.log("2. Go to Table Editor to see created tables");
  console.log("3. Create your admin user account");
  console.log("4. Test the React Portal connection");
  console.log("\n✅ Setup process complete!");
}

main().catch(console.error);
