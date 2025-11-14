/**
 * Test Login Flow
 * Verifies that the authentication is working
 */

import simpleAuth from "./src/services/simpleAuth.js";

async function testLogin() {
  console.log("🧪 Testing Login Flow\n");

  const email = "s.garay@carolinalumpers.com";
  const password = "admin123";

  try {
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("🔄 Attempting login...\n");

    const result = await simpleAuth.login(email, password);

    console.log("✅ Login successful!");
    console.log("👤 User Details:");
    console.log(`   • ID: ${result.workerId}`);
    console.log(`   • Name: ${result.displayName}`);
    console.log(`   • Email: ${result.email}`);
    console.log(`   • Role: ${result.role}`);
    console.log(`   • W9 Status: ${result.w9Status}`);
    console.log(`   • Language: ${result.language}`);

    console.log("\n🎯 Ready to login to React Portal!");
    console.log("📝 Use these credentials in the login form:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.log("❌ Login failed:", error.message);
  }
}

testLogin();
