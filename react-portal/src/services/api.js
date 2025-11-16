/**
 * API Service Layer
 * Pure Supabase implementation - no legacy systems
 *
 * This is a thin wrapper around supabaseApi for backward compatibility.
 * All new code should use supabaseApi directly from './supabase.js'
 */

import { supabaseApi } from "./supabase.js";

/**
 * API Client - Pure Supabase wrapper
 */
export const api = {
  /**
   * Login user with Supabase Auth
   */
  login: async (email, password) => {
    const result = await supabaseApi.signIn(email, password);

    return {
      success: true,
      workerId: result.worker.id,
      displayName: result.worker.display_name,
      email: result.worker.email,
      role: result.worker.role,
      w9Status: result.worker.w9_status,
      language: result.worker.language || "en",
    };
  },

  /**
   * Sign up new user
   */
  signup: async (email, password, displayName) => {
    const result = await supabaseApi.signUp(email, password, {
      display_name: displayName,
    });
    return {
      success: true,
      message: "Account created successfully",
    };
  },

  /**
   * Get user role
   */
  whoami: async (workerId) => {
    const worker = await supabaseApi.getWorker(workerId);
    return {
      ok: true,
      role: worker.role,
      worker: worker,
    };
  },

  /**
   * Get W-9 status
   */
  getW9Status: async (workerId) => {
    const worker = await supabaseApi.getWorker(workerId);
    return {
      success: true,
      status: worker.w9_status,
    };
  },

  /**
   * Admin: Get all workers
   */
  getReportAll: async (workerId, workersCsv = "") => {
    // Get all workers for admin dashboard
    const workers = await supabaseApi.getAllWorkers();
    return {
      success: true,
      data: workers,
    };
  },

  /**
   * Admin: Get pending W-9s
   */
  listPendingW9s: async (requesterId) => {
    const w9s = await supabaseApi.getPendingW9s();
    return {
      success: true,
      data: w9s,
    };
  },

  /**
   * Admin: Approve W-9
   */
  approveW9: async (w9RecordId, adminId) => {
    await supabaseApi.approveW9(w9RecordId, adminId);
    return {
      success: true,
      message: "W-9 approved successfully",
    };
  },

  /**
   * Admin: Reject W-9
   */
  rejectW9: async (w9RecordId, adminId, reason) => {
    await supabaseApi.rejectW9(w9RecordId, adminId, reason);
    return {
      success: true,
      message: "W-9 rejected",
    };
  },
};

export default api;
