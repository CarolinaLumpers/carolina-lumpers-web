/**
 * Direct Google Sheets API Access via Proxy Server
 * Uses service account authentication for secure access to private spreadsheet
 */

// Configuration
const PROXY_BASE_URL = import.meta.env.VITE_SHEETS_PROXY_URL || 'http://localhost:3001';
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

/**
 * Fetch data directly from Google Sheets
 * Requires public sheet or API key authentication
 */
export const sheetsApi = {
  /**
   * Get payroll data for a worker
   * Reads from "Payroll LineItems" sheet
   */
  getPayrollDirect: async (workerId, weekEnd) => {
    const range = 'Payroll LineItems!A:N'; // Adjust range as needed
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Sheets proxy error: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch payroll data');
      }
      const rows = result.data.values || [];
      
      if (rows.length === 0) {
        return { success: true, rows: [], totals: { entries: 0, checkAmountSum: 0 } };
      }
      
      // Parse headers (first row)
      const headers = rows[0];
      const workerIdx = headers.indexOf('WorkerID');
      const weekIdx = headers.indexOf('Week Period');
      const dateIdx = headers.indexOf('Date');
      const clientIdx = headers.indexOf('ClientID');
      const detailIdx = headers.indexOf('LineItemDetail');
      const amountIdx = headers.indexOf('Check Amount');
      
      // Filter and map rows
      const payrollRows = rows.slice(1)
        .filter(row => {
          const matchesWorker = row[workerIdx] === workerId;
          const matchesWeek = !weekEnd || row[weekIdx] === weekEnd;
          return matchesWorker && matchesWeek;
        })
        .map(row => ({
          date: row[dateIdx] || '',
          client: row[clientIdx] || '',
          hoursBreak: row[detailIdx] || '',
          checkAmount: parseFloat(row[amountIdx]) || 0,
        }));
      
      // Calculate totals
      const total = payrollRows.reduce((sum, r) => sum + r.checkAmount, 0);
      
      return {
        success: true,
        rows: payrollRows,
        totals: {
          entries: payrollRows.length,
          checkAmountSum: Math.round(total * 100) / 100,
        },
      };
    } catch (error) {
      console.error('Direct Sheets API error:', error);
      throw error;
    }
  },

  /**
   * Get all workers
   * Reads from "Workers" sheet
   */
  getWorkersDirect: async () => {
    const range = 'Workers!A:E'; // Adjust columns as needed
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch workers');
      }
      const rows = result.data.values || [];
      
      if (rows.length === 0) return [];
      
      const headers = rows[0];
      const idIdx = headers.indexOf('WorkerID');
      const nameIdx = headers.indexOf('DisplayName');
      const roleIdx = headers.indexOf('Role');
      
      return rows.slice(1)
        .filter(row => row[idIdx]) // Has WorkerID
        .map(row => ({
          id: row[idIdx],
          name: row[nameIdx] || row[idIdx],
          role: row[roleIdx] || 'Worker',
        }));
    } catch (error) {
      console.error('Failed to fetch workers from Sheets:', error);
      throw error;
    }
  },

  /**
   * Get clock-in records
   * Reads from "ClockIn" sheet
   */
  getClockInsDirect: async (workerId, date = null) => {
    const range = 'ClockIn!A:M'; // Adjust range
    const url = `${PROXY_BASE_URL}/api/sheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch clock-ins');
      }
      const rows = result.data.values || [];
      
      if (rows.length === 0) return [];
      
      const headers = rows[0];
      const workerIdx = headers.indexOf('WorkerID');
      const dateIdx = headers.indexOf('Date');
      const timeIdx = headers.indexOf('Time');
      const siteIdx = headers.indexOf('Site');
      const distanceIdx = headers.indexOf('Distance');
      const statusIdx = headers.indexOf('EditStatus');
      
      return rows.slice(1)
        .filter(row => {
          const matchesWorker = row[workerIdx] === workerId;
          const matchesDate = !date || row[dateIdx] === date;
          return matchesWorker && matchesDate;
        })
        .map(row => ({
          date: row[dateIdx] || '',
          time: row[timeIdx] || '',
          site: row[siteIdx] || '',
          distance: row[distanceIdx] || '',
          editStatus: row[statusIdx] || 'confirmed',
        }));
    } catch (error) {
      console.error('Failed to fetch clock-ins from Sheets:', error);
      throw error;
    }
  },
};

export default sheetsApi;
