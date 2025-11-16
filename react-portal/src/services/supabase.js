/**
 * Supabase Client Configuration
 * Handles database, auth, and real-time subscriptions
 */

import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase configuration missing. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables."
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper to detect device information for logging
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;

  let deviceType = "Unknown";
  if (/iPhone/.test(ua)) deviceType = "iPhone";
  else if (/iPad/.test(ua)) deviceType = "iPad";
  else if (/Android/.test(ua)) deviceType = "Android";
  else if (/Windows/.test(ua)) deviceType = "Windows";
  else if (/Macintosh|Mac OS X/.test(ua)) deviceType = "macOS";
  else if (/Linux/.test(ua)) deviceType = "Linux";

  let browserType = "Unknown Browser";
  if (/Edg\//.test(ua)) browserType = "Edge";
  else if (/Chrome/.test(ua) && !/Edg/.test(ua)) browserType = "Chrome";
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browserType = "Safari";
  else if (/Firefox/.test(ua)) browserType = "Firefox";
  else if (/Opera|OPR/.test(ua)) browserType = "Opera";

  return {
    displayString: `${deviceType} - ${browserType}`,
    type: deviceType,
    browser: browserType,
    userAgent: ua,
    isMobile: /iPhone|iPad|Android/.test(ua),
    screenSize: `${window.screen.width}x${window.screen.height}`,
  };
}

/**
 * Supabase API wrapper functions
 */
export const supabaseApi = {
  // Authentication
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get worker profile using UUID link (id references auth.users)
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (workerError) throw workerError;

    return {
      success: true,
      user: data.user,
      worker: worker,
    };
  },

  async signUp(email, password, workerData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create worker profile
    if (data.user) {
      const { error: profileError } = await supabase.from("workers").insert({
        ...workerData,
        email,
        id: data.user.id, // UUID from Supabase Auth
      });

      if (profileError) throw profileError;
    }

    return {
      success: true,
      user: data.user,
    };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;

    if (!user) return null;

    // Get worker profile using UUID
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*")
      .eq("id", user.id)
      .single();

    if (workerError) throw workerError;

    return { user, worker };
  },

  // Clock-ins
  async clockIn(workerId, latitude, longitude, device = null) {
    const deviceInfo = device || getDeviceInfo();
    const now = new Date();

    const { data, error } = await supabase
      .from("clock_ins")
      .insert({
        worker_id: workerId,
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().split(" ")[0],
        latitude: latitude,
        longitude: longitude,
        device: deviceInfo.displayString,
        timestamp: now.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  },

  async getClockIns(workerId, date = null) {
    let query = supabase
      .from("clock_ins")
      .select(
        `
        *,
        workers!inner(display_name)
      `
      )
      .eq("worker_id", workerId)
      .order("timestamp", { ascending: false });

    if (date) {
      query = query.eq("date", date);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  // Workers
  async getWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("is_active", true)
      .order("display_name");

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  async getAllWorkersWithClockIns() {
    try {
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

      const workers = (workersResult.data || []).map((worker) => ({
        id: worker.employee_id, // Business code for display (SG-001, etc.)
        name: worker.display_name,
        role: worker.role || "Worker",
        availability: worker.is_active ? "Active" : "Inactive",
        // Additional details for modal - mapped from Supabase columns
        employeeId: worker.employee_id, // Business code (was worker.id)
        firstName: worker.display_name.split(" ")[0] || "",
        lastName: worker.display_name.split(" ").slice(1).join(" ") || "",
        email: worker.email || "",
        phone: worker.phone || "",
        serviceItem: "Lumper Service", // Default value for Supabase
        hourlyRate: worker.hourly_rate || "",
        flatRateBonus: "", // Not implemented in Supabase schema
        appAccess: worker.role || "Worker",
        primaryLanguage:
          worker.language === "en"
            ? "English"
            : worker.language === "es"
            ? "Spanish"
            : worker.language === "pt"
            ? "Portuguese"
            : "English",
        photo: "", // Not implemented in Supabase schema yet
        qboid: "", // Not implemented in Supabase schema yet
        w9Status: worker.w9_status || "pending",
        // Supabase-specific fields
        isActive: worker.is_active,
        notes: worker.notes || "",
        createdAt: worker.created_at,
        updatedAt: worker.updated_at,
      }));

      // Parse today's clock-ins by worker
      const records = {};
      (clockInsResult.data || []).forEach((clockIn) => {
        const workerId = clockIn.worker_id;
        if (!workerId) return;

        if (!records[workerId]) {
          records[workerId] = [];
        }

        const clockInTime = new Date(clockIn.clock_in_time);
        records[workerId].push({
          date: clockInTime.toLocaleDateString(),
          time: clockInTime.toLocaleTimeString(),
          site: clockIn.client_id || "Unknown",
          distance: clockIn.distance_miles || "",
        });
      });

      return { workers, records };
    } catch (error) {
      console.error("Failed to fetch workers with clock-ins:", error);
      throw error;
    }
  },

  async getWorkerRole(workerId) {
    const { data, error } = await supabase
      .from("workers")
      .select("role")
      .eq("id", workerId)
      .single();

    if (error) throw error;

    return {
      ok: true,
      role: data.role || "Worker",
    };
  },

  async addWorker(workerData) {
    const { data, error } = await supabase
      .from("workers")
      .insert({
        ...workerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  },

  // Clients (for geofencing)
  async getClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("active", true);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  // W9 Management
  async getPendingW9s() {
    const { data, error } = await supabase
      .from("w9_submissions")
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email)
      `
      )
      .eq("status", "pending")
      .order("submitted_date", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  async getAllW9s() {
    const { data, error } = await supabase
      .from("w9_submissions")
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email),
        reviewer:workers!reviewed_by(employee_id, display_name)
      `
      )
      .order("submitted_date", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  async getWorkerW9(workerId) {
    const { data, error } = await supabase
      .from("w9_submissions")
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email)
      `
      )
      .eq("worker_id", workerId)
      .order("submitted_date", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return {
      success: true,
      data: data || null,
    };
  },

  async updateW9Status(w9RecordId, status, reviewerId, reason = null) {
    const updates = {
      status,
      reviewed_date: new Date().toISOString(),
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updates.rejection_reason = reason;
    }

    const { data, error } = await supabase
      .from("w9_submissions")
      .update(updates)
      .eq("w9_record_id", w9RecordId)
      .select(
        `
        *,
        worker:workers!w9_submissions_worker_id_fkey(employee_id, display_name, email)
      `
      )
      .single();

    if (error) throw error;

    // Update worker's w9_status
    if (data && data.worker_id) {
      await supabase
        .from("workers")
        .update({
          w9_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.worker_id);
    }

    return {
      success: true,
      data: data,
    };
  },

  async submitW9(w9Data) {
    const { data, error } = await supabase
      .from("w9_submissions")
      .insert({
        ...w9Data,
        submitted_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        worker:workers!w9_submissions_worker_id_fkey(employee_id, display_name, email)
      `
      )
      .single();

    if (error) throw error;

    // Update worker's w9_status to 'submitted'
    if (data && data.worker_id) {
      await supabase
        .from("workers")
        .update({
          w9_status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.worker_id);
    }

    return {
      success: true,
      data: data,
    };
  },

  // ===================================================
  // Clock-ins Management
  // ===================================================

  /**
   * Get clock-ins for a specific worker
   * @param {string} workerId - Worker UUID
   * @param {string} startDate - Optional start date (YYYY-MM-DD)
   * @param {string} endDate - Optional end date (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getWorkerClockIns(workerId, startDate = null, endDate = null) {
    let query = supabase
      .from("clock_ins")
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email)
      `
      )
      .eq("worker_id", workerId)
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  /**
   * Get all clock-ins (admin view)
   * @param {Object} filters - Optional filters { workerId, startDate, endDate, editStatus }
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getAllClockIns(filters = {}) {
    let query = supabase
      .from("clock_ins")
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email)
      `
      )
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (filters.workerId) {
      query = query.eq("worker_id", filters.workerId);
    }
    if (filters.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("date", filters.endDate);
    }
    if (filters.editStatus) {
      query = query.eq("edit_status", filters.editStatus);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  /**
   * Submit new clock-in (from mobile device)
   * @param {Object} clockInData - Clock-in data
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async submitClockIn(clockInData) {
    const { data, error } = await supabase
      .from("clock_ins")
      .insert({
        ...clockInData,
        edit_status: "confirmed",
        created_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email)
      `
      )
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  },

  /**
   * Update clock-in edit status
   * @param {string} clockInId - Clock-in UUID
   * @param {string} editStatus - New status (confirmed, pending, editing, denied)
   * @param {string} notes - Optional notes
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async updateClockInStatus(clockInId, editStatus, notes = null) {
    const updates = {
      edit_status: editStatus,
    };

    if (notes) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from("clock_ins")
      .update(updates)
      .eq("id", clockInId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  },

  /**
   * Get clock-ins for today (dashboard quick view)
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getTodayClockIns() {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from("clock_ins")
      .select(
        `
        *,
        worker:workers!worker_id(employee_id, display_name, email)
      `
      )
      .eq("date", today)
      .order("time", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  },

  /**
   * Get clock-in count for worker in date range (for payroll)
   * @param {string} workerId - Worker UUID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, count: number, data: Array}>}
   */
  async getWorkerClockInCount(workerId, startDate, endDate) {
    const { data, error, count } = await supabase
      .from("clock_ins")
      .select("*", { count: "exact" })
      .eq("worker_id", workerId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) throw error;

    return {
      success: true,
      count: count || 0,
      data: data || [],
    };
  },

  // Real-time subscriptions
  subscribeToClockIns(callback) {
    return supabase
      .channel("clock_ins")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clock_ins",
        },
        callback
      )
      .subscribe();
  },

  subscribeToWorkers(callback) {
    return supabase
      .channel("workers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workers",
        },
        callback
      )
      .subscribe();
  },

  unsubscribe(channel) {
    return supabase.removeChannel(channel);
  },
};

export default supabase;
