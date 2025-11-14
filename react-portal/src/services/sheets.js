/**
 * DEPRECATED: Legacy Google Sheets API Access via Proxy Server
 *
 * ⚠️  THIS FILE IS DEPRECATED - MIGRATING TO SUPABASE ⚠️
 *
 * TODO: Remove this file after full Supabase migration is complete
 * Current status:
 * ✅ Workers management - Migrated to Supabase
 * ❌ W9s management - Still needs Supabase implementation
 * ❌ Time edit requests - Still needs Supabase implementation
 * ❌ Payroll reports - Still needs Supabase implementation
 * ❌ Clock-in data - Still needs Supabase implementation
 *
 * Uses service account authentication for secure access to private spreadsheet
 */

// Configuration
const PROXY_BASE_URL =
  import.meta.env.VITE_SHEETS_PROXY_URL || "http://localhost:3001";
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

/**
 * Fetch data directly from Google Sheets
 * Requires public sheet or API key authentication
 */
export const sheetsApi = {
  /**
   * Get payroll data for a worker
   * Reads from "Payroll LineItems" sheet
   *
   * @param {string} workerId - Worker ID (e.g., "SG-001")
   * @param {object} options - Filter options
   * @param {string} options.filterType - 'week' | 'dateRange'
   * @param {string} options.weekPeriod - Saturday date for week filtering (e.g., "2025-01-18")
   * @param {string} options.startDate - Start date for range filtering (YYYY-MM-DD)
   * @param {string} options.endDate - End date for range filtering (YYYY-MM-DD)
   */
  getPayrollDirect: async (workerId, options = {}) => {
    const range = "Payroll LineItems!A:O"; // Include all columns including "Run Payroll"
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch payroll data");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) {
        return {
          success: true,
          entries: [],
          totals: { count: 0, totalAmount: 0 },
        };
      }

      // Parse headers (first row)
      const headers = rows[0];
      const workerIdx = headers.indexOf("WorkerID");
      const dateIdx = headers.indexOf("Date");
      const clientIdx = headers.indexOf("ClientID");
      const detailIdx = headers.indexOf("LineItemDetail");
      const amountIdx = headers.indexOf("Check Amount");
      const weekPeriodIdx = headers.indexOf("Week Period");
      const runPayrollIdx = headers.indexOf("Run Payroll");

      // Helper: Normalize date from M/D/YYYY to YYYY-MM-DD for comparison
      const normalizeDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        } catch {
          return dateStr; // Return as-is if parsing fails
        }
      };

      // Filter and map rows
      const payrollRows = rows
        .slice(1)
        .filter((row) => {
          // Must match worker
          if (row[workerIdx] !== workerId) return false;

          // Apply date/week filtering
          if (options.filterType === "week" && options.weekPeriod) {
            // Filter by Week Period (Saturday date)
            const rowWeekPeriod = normalizeDate(row[weekPeriodIdx]);
            return rowWeekPeriod === options.weekPeriod;
          } else if (
            options.filterType === "dateRange" &&
            options.startDate &&
            options.endDate
          ) {
            // Filter by Date range
            const rowDate = normalizeDate(row[dateIdx]);
            if (!rowDate) return false;
            return rowDate >= options.startDate && rowDate <= options.endDate;
          }

          // If no filter specified, include all
          return true;
        })
        .map((row) => ({
          date: row[dateIdx] || "",
          site: row[clientIdx] || "", // ClientID as site
          description: row[detailIdx] || "", // LineItemDetail
          amount: parseFloat(row[amountIdx]) || 0, // Check Amount
        }));

      // Calculate totals
      const totalAmount = payrollRows.reduce((sum, r) => sum + r.amount, 0);

      return {
        success: true,
        entries: payrollRows,
        totals: {
          count: payrollRows.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
        },
      };
    } catch (error) {
      console.error("Direct Sheets API error:", error);
      throw error;
    }
  },

  /**
   * Get all workers
   * Reads from "Workers" sheet
   */
  getWorkersDirect: async () => {
    const range = "Workers!A:L"; // Extended to include App Access column
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch workers");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) return [];

      const headers = rows[0];
      const idIdx = headers.indexOf("WorkerID");
      const nameIdx = headers.indexOf("Display Name");
      const appAccessIdx = headers.indexOf("App Access"); // Use App Access instead of Role

      return rows
        .slice(1)
        .filter((row) => row[idIdx]) // Has WorkerID
        .map((row) => ({
          id: row[idIdx],
          name: row[nameIdx] || row[idIdx],
          role: row[appAccessIdx] || "Worker", // Get from App Access column
        }));
    } catch (error) {
      console.error("Failed to fetch workers from Sheets:", error);
      throw error;
    }
  },

  /**
   * Get clock-in records for today
   * Reads from "ClockIn" sheet
   *
   * @param {string} workerId - Worker ID
   * @param {string} date - Date in M/D/YYYY format (e.g., "11/12/2025")
   */
  getClockInsDirect: async (workerId, date = null) => {
    const range = "ClockIn!A:L"; // ClockinID through Distance (mi)
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch clock-ins");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) return [];

      const headers = rows[0];
      const workerIdx = headers.indexOf("WorkerID");
      const dateIdx = headers.indexOf("Date");
      const timeIdx = headers.indexOf("Time");
      const clientIdx = headers.indexOf("Nearest Client");
      const distanceIdx = headers.indexOf("Distance (mi)"); // Note: has space in header

      return rows
        .slice(1)
        .filter((row) => {
          const matchesWorker = row[workerIdx] === workerId;
          const matchesDate = !date || row[dateIdx] === date;
          return matchesWorker && matchesDate;
        })
        .map((row) => ({
          date: row[dateIdx] || "",
          time: row[timeIdx] || "",
          site: row[clientIdx] || "",
          distance: row[distanceIdx] || "",
        }));
    } catch (error) {
      console.error("Failed to fetch clock-ins from Sheets:", error);
      throw error;
    }
  },

  /**
   * Get all workers with today's clock-in status
   * Reads from Workers and ClockIn sheets
   */
  getAllWorkersWithClockIns: async () => {
    try {
      // Get today's date in M/D/YYYY format
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
      const today = formatter.format(now);

      // Fetch workers and clock-ins in parallel
      const [workersResponse, clockInsResponse] = await Promise.all([
        fetch(
          `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
            "Workers!A:S"
          )}`
        ), // Extended to S to include DisplayName (S) and Availability (K)
        fetch(
          `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
            "ClockIn!A:L"
          )}`
        ),
      ]);

      if (!workersResponse.ok || !clockInsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const workersResult = await workersResponse.json();
      const clockInsResult = await clockInsResponse.json();

      const workerRows = workersResult.data?.values || [];
      const clockInRows = clockInsResult.data?.values || [];

      if (workerRows.length === 0) return { workers: [], records: {} };

      // Parse workers
      const workerHeaders = workerRows[0];
      const workerIdIdx = workerHeaders.indexOf("WorkerID");
      const displayNameIdx = workerHeaders.indexOf("Display Name"); // Note: Header has space
      const availabilityIdx = workerHeaders.indexOf("Availability");

      // Get all relevant column indices
      const employeeIdIdx = workerHeaders.indexOf("Employee ID");
      const firstNameIdx = workerHeaders.indexOf("First Name");
      const lastNameIdx = workerHeaders.indexOf("Last Name");
      const emailIdx = workerHeaders.indexOf("Email");
      const phoneIdx = workerHeaders.indexOf("Phone");
      const serviceItemIdx = workerHeaders.indexOf("ServiceItem");
      const hourlyRateIdx = workerHeaders.indexOf("Hourly Rate");
      const flatRateBonusIdx = workerHeaders.indexOf("Flat Rate Bonus");
      const appAccessIdx = workerHeaders.indexOf("App Access"); // Use App Access for portal role
      const primaryLanguageIdx = workerHeaders.indexOf("Primary Language");
      const photoIdx = workerHeaders.indexOf("Photo");
      const qboidIdx = workerHeaders.indexOf("QBOID");
      const w9StatusIdx = workerHeaders.indexOf("W9Status");

      const workers = workerRows
        .slice(1)
        .filter((row) => row[workerIdIdx])
        .map((row) => ({
          id: row[workerIdIdx],
          name: row[displayNameIdx] || row[workerIdIdx],
          role: row[appAccessIdx] || "Worker", // Get role from App Access column, not Role column
          availability: row[availabilityIdx] || "", // Keep empty if not specified
          // Additional details for modal
          employeeId: row[employeeIdIdx] || "",
          firstName: row[firstNameIdx] || "",
          lastName: row[lastNameIdx] || "",
          email: row[emailIdx] || "",
          phone: row[phoneIdx] || "",
          serviceItem: row[serviceItemIdx] || "",
          hourlyRate: row[hourlyRateIdx] || "",
          flatRateBonus: row[flatRateBonusIdx] || "",
          appAccess: row[appAccessIdx] || "",
          primaryLanguage: row[primaryLanguageIdx] || "",
          photo: row[photoIdx] || "",
          qboid: row[qboidIdx] || "",
          w9Status: row[w9StatusIdx] || "",
        }));

      // Parse today's clock-ins
      const clockInHeaders = clockInRows[0];
      const ciWorkerIdx = clockInHeaders.indexOf("WorkerID");
      const ciDateIdx = clockInHeaders.indexOf("Date");
      const ciTimeIdx = clockInHeaders.indexOf("Time");
      const ciClientIdx = clockInHeaders.indexOf("Nearest Client");
      const ciDistanceIdx = clockInHeaders.indexOf("Distance (mi)");

      const records = {};
      clockInRows
        .slice(1)
        .filter((row) => row[ciDateIdx] === today)
        .forEach((row) => {
          const workerId = row[ciWorkerIdx];
          if (!workerId) return;

          if (!records[workerId]) {
            records[workerId] = [];
          }
          records[workerId].push({
            date: row[ciDateIdx],
            time: row[ciTimeIdx],
            site: row[ciClientIdx],
            distance: row[ciDistanceIdx] || "",
          });
        });

      return { workers, records };
    } catch (error) {
      console.error("Failed to fetch workers with clock-ins:", error);
      throw error;
    }
  },

  /**
   * Get pending W-9 submissions
   * Reads from W9_Records sheet
   */
  getPendingW9s: async () => {
    const range = "W9_Records!A:L";
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch W-9s");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) return [];

      const headers = rows[0];
      const recordIdIdx = headers.indexOf("W9RecordID");
      const workerIdIdx = headers.indexOf("WorkerID");
      const displayNameIdx = headers.indexOf("DisplayName");
      const legalNameIdx = headers.indexOf("LegalName");
      const taxClassIdx = headers.indexOf("TaxClassification");
      const addressIdx = headers.indexOf("Address");
      const ssnLast4Idx = headers.indexOf("SSN_Last4");
      const statusIdx = headers.indexOf("Status");
      const submittedIdx = headers.indexOf("SubmittedAt");
      const pdfUrlIdx = headers.indexOf("PDFUrl");

      return rows
        .slice(1)
        .filter((row) => row[statusIdx] === "Pending")
        .map((row) => ({
          w9RecordId: row[recordIdIdx] || "",
          workerId: row[workerIdIdx] || "",
          displayName: row[displayNameIdx] || "",
          legalName: row[legalNameIdx] || "",
          taxClassification: row[taxClassIdx] || "",
          address: row[addressIdx] || "",
          ssnLast4: row[ssnLast4Idx] || "",
          submittedDate: row[submittedIdx] || "",
          pdfUrl: row[pdfUrlIdx] || "",
        }));
    } catch (error) {
      console.error("Failed to fetch pending W-9s:", error);
      throw error;
    }
  },

  /**
   * Get pending time edit requests
   * Reads from TimeEditRequests sheet
   */
  getTimeEditRequests: async () => {
    const range = "TimeEditRequests!A:J";
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch time edit requests");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) return [];

      const headers = rows[0];
      const requestIdIdx = headers.indexOf("RequestID");
      const employeeIdIdx = headers.indexOf("WorkerID");
      const employeeNameIdx = headers.indexOf("EmployeeName");
      const originalTimeIdx = headers.indexOf("OriginalTime");
      const requestedTimeIdx = headers.indexOf("RequestedTime");
      const reasonIdx = headers.indexOf("Reason");
      const statusIdx = headers.indexOf("Status");
      const submittedIdx = headers.indexOf("SubmittedAt");

      return rows
        .slice(1)
        .filter((row) => row[statusIdx] === "Pending")
        .map((row) => ({
          requestId: row[requestIdIdx] || "",
          employeeId: row[employeeIdIdx] || "",
          employeeName: row[employeeNameIdx] || "",
          originalTime: row[originalTimeIdx] || "",
          requestedTime: row[requestedTimeIdx] || "",
          reason: row[reasonIdx] || "",
          submittedAt: row[submittedIdx] || "",
        }));
    } catch (error) {
      console.error("Failed to fetch time edit requests:", error);
      throw error;
    }
  },

  /**
   * Get worker role by ID (replaces api.whoami)
   * Reads from Workers sheet - uses App Access column, not Role column
   *
   * @param {string} workerId - Worker ID
   * @returns {object} - { ok: true, role: 'Admin' | 'Lead' | 'Worker' }
   */
  getWorkerRole: async (workerId) => {
    const range = "Workers!A:L"; // WorkerID through App Access
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch worker");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) {
        return { ok: false, error: "Worker not found" };
      }

      const headers = rows[0];
      const workerIdIdx = headers.indexOf("WorkerID");
      const appAccessIdx = headers.indexOf("App Access"); // Use App Access column instead of Role

      const workerRow = rows
        .slice(1)
        .find((row) => row[workerIdIdx] === workerId);

      if (!workerRow) {
        return { ok: false, error: "Worker not found" };
      }

      return {
        ok: true,
        role: workerRow[appAccessIdx] || "Worker", // Get role from App Access column
      };
    } catch (error) {
      console.error("Failed to fetch worker role:", error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Get W-9 status by worker ID (replaces api.getW9Status)
   * Reads from W9_Records sheet
   *
   * @param {string} workerId - Worker ID
   * @returns {object} - { ok: true, status: 'approved' | 'pending' | 'none' }
   */
  getW9Status: async (workerId) => {
    const range = "W9_Records!A:H"; // Through Status column
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch W-9 status");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) {
        return { ok: true, status: "none" };
      }

      const headers = rows[0];
      const workerIdIdx = headers.indexOf("WorkerID");
      const statusIdx = headers.indexOf("Status");

      // Find most recent W-9 record for this worker
      const w9Records = rows
        .slice(1)
        .filter((row) => row[workerIdIdx] === workerId)
        .map((row) => ({
          status: (row[statusIdx] || "none").toLowerCase(),
        }));

      if (w9Records.length === 0) {
        return { ok: true, status: "none" };
      }

      // Return most recent record (last in array)
      const latestRecord = w9Records[w9Records.length - 1];
      return {
        ok: true,
        status: latestRecord.status,
      };
    } catch (error) {
      console.error("Failed to fetch W-9 status:", error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Update time edit request status (replaces approveTimeEdit/denyTimeEdit)
   * Updates TimeEditRequests sheet status
   *
   * @param {string} requestId - Request ID
   * @param {string} status - 'Approved' | 'Denied'
   * @param {string} reason - Optional denial reason
   */
  updateTimeEditStatus: async (requestId, status, reason = "") => {
    // First, find the row number for this request
    const range = "TimeEditRequests!A:J";
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch requests");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) {
        throw new Error("No time edit requests found");
      }

      const headers = rows[0];
      const requestIdIdx = headers.indexOf("RequestID");
      const statusIdx = headers.indexOf("Status");
      const reviewedByIdx = headers.indexOf("ReviewedBy");
      const reviewedAtIdx = headers.indexOf("ReviewedAt");
      const denialReasonIdx = headers.indexOf("DenialReason");

      // Find the row index (add 2: 1 for header, 1 for 1-based indexing)
      const dataRowIdx = rows
        .slice(1)
        .findIndex((row) => row[requestIdIdx] === requestId);
      if (dataRowIdx === -1) {
        throw new Error("Request not found");
      }
      const rowNumber = dataRowIdx + 2;

      // Update the row with new status and review info
      const currentRow = rows[dataRowIdx + 1];
      const updatedRow = [...currentRow];
      updatedRow[statusIdx] = status;
      updatedRow[reviewedAtIdx] = new Date().toISOString();
      if (status === "Denied" && reason) {
        updatedRow[denialReasonIdx] = reason;
      }

      const updateRange = `TimeEditRequests!A${rowNumber}:J${rowNumber}`;
      const updateUrl = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        updateRange
      )}`;

      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [updatedRow] }),
      });

      const updateResult = await updateResponse.json();
      if (!updateResult.ok) {
        throw new Error(updateResult.error || "Failed to update request");
      }

      return { ok: true };
    } catch (error) {
      console.error("Failed to update time edit status:", error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Update W-9 record status (replaces approveW9/rejectW9)
   * Updates W9_Records sheet status
   *
   * @param {string} w9RecordId - W9 Record ID
   * @param {string} status - 'Approved' | 'Rejected'
   * @param {string} reason - Optional rejection reason
   */
  updateW9Status: async (w9RecordId, status, reason = "") => {
    // First, find the row number for this record
    const range = "W9_Records!A:L";
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch W-9 records");
      }
      const rows = result.data.values || [];

      if (rows.length === 0) {
        throw new Error("No W-9 records found");
      }

      const headers = rows[0];
      const recordIdIdx = headers.indexOf("W9RecordID");
      const statusIdx = headers.indexOf("Status");
      const reviewedByIdx = headers.indexOf("ReviewedBy");
      const reviewedAtIdx = headers.indexOf("ReviewedAt");
      const rejectionReasonIdx = headers.indexOf("RejectionReason");

      // Find the row index
      const dataRowIdx = rows
        .slice(1)
        .findIndex((row) => row[recordIdIdx] === w9RecordId);
      if (dataRowIdx === -1) {
        throw new Error("W-9 record not found");
      }
      const rowNumber = dataRowIdx + 2;

      // Update the row with new status and review info
      const currentRow = rows[dataRowIdx + 1];
      const updatedRow = [...currentRow];
      updatedRow[statusIdx] = status;
      updatedRow[reviewedAtIdx] = new Date().toISOString();
      if (status === "Rejected" && reason) {
        updatedRow[rejectionReasonIdx] = reason;
      }

      const updateRange = `W9_Records!A${rowNumber}:L${rowNumber}`;
      const updateUrl = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        updateRange
      )}`;

      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [updatedRow] }),
      });

      const updateResult = await updateResponse.json();
      if (!updateResult.ok) {
        throw new Error(updateResult.error || "Failed to update W-9");
      }

      return { ok: true };
    } catch (error) {
      console.error("Failed to update W-9 status:", error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * CRUD Operations for Workers and Clock-Ins
   */

  // Add new worker
  addWorker: async (workerData) => {
    const range = "Workers!A:S"; // Append to Workers sheet
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}/append`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [
            [
              workerData.workerId,
              workerData.employeeId,
              workerData.firstName,
              workerData.lastName,
              workerData.email,
              workerData.phone,
              workerData.role,
              workerData.serviceItem,
              workerData.hourlyRate,
              workerData.flatRateBonus,
              workerData.availability,
              workerData.appAccess,
              workerData.applicationId,
              workerData.primaryLanguage,
              workerData.workHistory,
              workerData.photo,
              workerData.qboid,
              workerData.w9Status,
              workerData.displayName,
            ],
          ],
        }),
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error("Failed to add worker:", error);
      throw error;
    }
  },

  // Update worker by row number
  updateWorker: async (rowNumber, workerData) => {
    const range = `Workers!A${rowNumber}:S${rowNumber}`;
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [
            [
              workerData.workerId,
              workerData.employeeId,
              workerData.firstName,
              workerData.lastName,
              workerData.email,
              workerData.phone,
              workerData.role,
              workerData.serviceItem,
              workerData.hourlyRate,
              workerData.flatRateBonus,
              workerData.availability,
              workerData.appAccess,
              workerData.applicationId,
              workerData.primaryLanguage,
              workerData.workHistory,
              workerData.photo,
              workerData.qboid,
              workerData.w9Status,
              workerData.displayName,
            ],
          ],
        }),
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error("Failed to update worker:", error);
      throw error;
    }
  },

  // Deactivate worker (set Availability to Inactive)
  deactivateWorker: async (rowNumber) => {
    const range = `Workers!K${rowNumber}`; // Availability column
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [["Inactive"]],
        }),
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error("Failed to deactivate worker:", error);
      throw error;
    }
  },

  // Add clock-in entry
  addClockIn: async (clockInData) => {
    const range = "ClockIn!A:L";
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}/append`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [
            [
              clockInData.clockinId,
              clockInData.workerId,
              clockInData.date,
              clockInData.time,
              clockInData.notes,
              clockInData.taskId,
              clockInData.approveToTasks,
              clockInData.latitude,
              clockInData.longitude,
              clockInData.needsProcessing,
              clockInData.nearestClient,
              clockInData.distance,
            ],
          ],
        }),
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error("Failed to add clock-in:", error);
      throw error;
    }
  },

  // Update clock-in by row number
  updateClockIn: async (rowNumber, clockInData) => {
    const range = `ClockIn!A${rowNumber}:L${rowNumber}`;
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [
            [
              clockInData.clockinId,
              clockInData.workerId,
              clockInData.date,
              clockInData.time,
              clockInData.notes,
              clockInData.taskId,
              clockInData.approveToTasks,
              clockInData.latitude,
              clockInData.longitude,
              clockInData.needsProcessing,
              clockInData.nearestClient,
              clockInData.distance,
            ],
          ],
        }),
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error("Failed to update clock-in:", error);
      throw error;
    }
  },

  // Delete clock-in by row number
  deleteClockIn: async (rowNumber) => {
    const range = `ClockIn!A${rowNumber}:L${rowNumber}`;
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;

    try {
      const response = await fetch(url, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error("Failed to delete clock-in:", error);
      throw error;
    }
  },
};

export default sheetsApi;
