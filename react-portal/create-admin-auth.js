/**
 * Create Admin User in Supabase Auth
 * This sets up proper authentication using Supabase's built-in auth system
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// Use SERVICE KEY for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY; // Admin key for user creation

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminAuth() {
  console.log("🔐 Setting up Supabase Authentication\n");

  const adminEmail = process.env.ADMIN_EMAIL || "s.garay@carolinalumpers.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.log("❌ Missing ADMIN_PASSWORD in .env.local");
    console.log("   Add: ADMIN_PASSWORD=your-secure-password");
    return;
  }

  try {
    console.log("👤 Creating admin user in Supabase Auth...");

    // Create user in Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          display_name: "Steve Garay",
          role: "Admin",
        },
      });

    if (authError) {
      if (authError.message.includes("already registered")) {
        console.log("ℹ️  User already exists in Supabase Auth");

        // Get existing user
        const { data: users, error: listError } =
          await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.users.find((u) => u.email === adminEmail);
        if (existingUser) {
          console.log("✅ Found existing auth user:", existingUser.id);
          await updateWorkerWithAuthId(existingUser.id);
          return;
        }
      } else {
        throw authError;
      }
    } else {
      console.log("✅ Auth user created:", authUser.user.id);
      await updateWorkerWithAuthId(authUser.user.id);
    }

    console.log("\n🎯 Admin authentication setup complete!");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password:", adminPassword);
    console.log("🌐 Login URL: http://localhost:5173/");
  } catch (error) {
    console.log("❌ Error setting up auth:", error.message);
    if (error.details) console.log("   Details:", error.details);
  }
}

async function updateWorkerWithAuthId(authUserId) {
  console.log("🔗 Linking worker profile to auth user...");

  try {
    // Update the worker record with the auth user ID
    const { error: updateError } = await supabaseAdmin
      .from("workers")
      .update({
        auth_user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("email", "s.garay@carolinalumpers.com");

    if (updateError) throw updateError;

    console.log("✅ Worker profile linked to auth user");

    // Verify the link
    const { data: worker, error: fetchError } = await supabaseAdmin
      .from("workers")
      .select("id, display_name, email, role, auth_user_id")
      .eq("email", "s.garay@carolinalumpers.com")
      .single();

    if (fetchError) throw fetchError;

    console.log("📋 Verified worker profile:");
    console.log("   • Worker ID:", worker.id);
    console.log("   • Name:", worker.display_name);
    console.log("   • Role:", worker.role);
    console.log("   • Auth ID:", worker.auth_user_id);
  } catch (error) {
    console.log("❌ Error linking worker profile:", error.message);
  }
}

createAdminAuth();
