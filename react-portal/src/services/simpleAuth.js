/**
 * Simple Authentication Service for CLS Migration
 * Validates login against workers table (bypass Supabase Auth for now)
 */

import { supabase } from "./supabase.js";

export const simpleAuth = {
  /**
   * Simple login using email and a basic password
   * For migration period - validates against workers table
   */
  async login(email, password = "admin123") {
    try {
      // Check if worker exists in our table
      const { data: worker, error } = await supabase
        .from("workers")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single();

      if (error || !worker) {
        throw new Error("Invalid email or user not found");
      }

      // For now, accept simple passwords for testing
      const validPasswords = ["admin123", "test123", "carolina123"];

      if (!validPasswords.includes(password)) {
        throw new Error("Invalid password");
      }

      // Return user data in expected format
      return {
        success: true,
        workerId: worker.id,
        displayName: worker.display_name,
        email: worker.email,
        role: worker.role,
        w9Status: worker.w9_status,
        language: worker.language || "en",
      };
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  },

  /**
   * Get user by worker ID
   */
  async getWorkerById(workerId) {
    try {
      const { data: worker, error } = await supabase
        .from("workers")
        .select("*")
        .eq("id", workerId)
        .single();

      if (error || !worker) {
        throw new Error("Worker not found");
      }

      return {
        workerId: worker.id,
        displayName: worker.display_name,
        email: worker.email,
        role: worker.role,
        w9Status: worker.w9_status,
        language: worker.language || "en",
      };
    } catch (error) {
      throw new Error(error.message || "Failed to get worker data");
    }
  },

  /**
   * Validate session (check if user still exists and is active)
   */
  async validateSession(workerId) {
    try {
      const worker = await this.getWorkerById(workerId);
      return { valid: true, user: worker };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },
};

// Export default for easy importing
export default simpleAuth;
