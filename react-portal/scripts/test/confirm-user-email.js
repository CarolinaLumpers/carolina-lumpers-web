/**
 * Confirm User Email in Supabase Auth
 * Fixes 400 error on login when email is not confirmed
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2] || "albertjgarciav@gmail.com";

async function confirmEmail() {
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }

  const user = users.find((u) => u.email === email);

  if (!user) {
    console.error("❌ User not found:", email);
    return;
  }

  console.log("📧 User:", user.email);
  console.log("✓ Confirmed:", user.email_confirmed_at ? "Yes" : "No");

  if (!user.email_confirmed_at) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error("❌ Error confirming:", updateError.message);
      return;
    }

    console.log("✅ Email confirmed successfully!");
  } else {
    console.log("ℹ️  Email already confirmed");
  }
}

confirmEmail();
