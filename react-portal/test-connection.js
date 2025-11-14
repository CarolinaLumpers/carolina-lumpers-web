import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log("🔧 Supabase Connection Test\n");
console.log("URL:", SUPABASE_URL);
console.log("Service Key exists:", !!SERVICE_KEY);
console.log("Service Key length:", SERVICE_KEY?.length || 0);
console.log("Anon Key exists:", !!ANON_KEY);

// Test basic API endpoint
async function testConnection() {
  try {
    console.log("\n🧪 Testing REST API endpoint...");

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log("Status:", response.status);
    console.log("OK:", response.ok);

    if (response.ok) {
      console.log("✅ Connection successful!");
    } else {
      const text = await response.text();
      console.log("❌ Response:", text);
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

testConnection();
