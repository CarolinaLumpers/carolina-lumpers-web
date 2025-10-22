/**
 * Clock-In Manager Module
 * Handles loading and filtering all worker clock-ins for admin view
 */

export class ClockInManager {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.currentFilter = '';
  }

  /**
   * Initialize the Clock-In Manager
   */
  init() {
    const btnLoadAll = document.getElementById('btnLoadAll');
    const btnClear = document.getElementById('btnClearFilter');
    const filterEl = document.getElementById('workerFilter');

    if (btnLoadAll) {
      btnLoadAll.addEventListener('click', () => {
        const selectedWorker = filterEl.value;
        this.loadAllReports(selectedWorker);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        filterEl.value = '';
        this.loadAllReports('');
      });
    }

    // Populate worker filter dropdown
    this.populateWorkerFilter();
  }

  /**
   * Populate the worker filter dropdown
   */
  async populateWorkerFilter() {
    const filterEl = document.getElementById('workerFilter');
    if (!filterEl) return;

    try {
      // Get all workers (similar to existing implementation)
      const url = `${this.apiUrl}?action=getAllWorkers`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.workers) {
        filterEl.innerHTML = '<option value="">-- All Workers --</option>';
        data.workers.forEach(worker => {
          const option = document.createElement('option');
          option.value = worker.workerId;
          option.textContent = `${worker.displayName} (${worker.workerId})`;
          filterEl.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Failed to load workers for filter:', err);
    }
  }

  /**
   * Load all clock-in reports with optional worker filter
   */
  async loadAllReports(filterWorkerId = '') {
    const container = document.getElementById('allReportsContainer');
    if (!container) return;

    this.currentFilter = filterWorkerId;
    container.innerHTML = '<p class="muted">Loading all clock-ins...</p>';

    try {
      const url = filterWorkerId 
        ? `${this.apiUrl}?action=reportAs&workerId=${encodeURIComponent(filterWorkerId)}`
        : `${this.apiUrl}?action=reportAll`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.ok || !data.records || data.records.length === 0) {
        container.innerHTML = '<p class="muted">No clock-in records found.</p>';
        return;
      }

      this.renderClockInTable(data.records, container);
    } catch (err) {
      console.error('Error loading all reports:', err);
      container.innerHTML = '<p class="error">Failed to load clock-ins. Please try again.</p>';
    }
  }

  /**
   * Render clock-in records as a table
   */
  renderClockInTable(records, container) {
    let html = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Site</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Hours</th>
            <th>Break (min)</th>
            <th>Status</th>
            <th>Distance</th>
          </tr>
        </thead>
        <tbody>
    `;

    records.forEach(rec => {
      const hours = rec.hours || 0;
      const breakMin = rec.breakMinutes || 0;
      const distance = rec.distance ? `${rec.distance.toFixed(2)} mi` : 'N/A';
      const status = rec.editStatus || 'confirmed';
      const statusClass = status === 'confirmed' ? 'status-confirmed' : 
                         status === 'pending' ? 'status-pending' : 'status-editing';

      html += `
        <tr>
          <td>${this.escapeHtml(rec.displayName || rec.workerId)}</td>
          <td>${this.escapeHtml(rec.siteName || 'N/A')}</td>
          <td>${this.formatDateTime(rec.clockInTime)}</td>
          <td>${rec.clockOutTime ? this.formatDateTime(rec.clockOutTime) : 'Still working'}</td>
          <td>${hours.toFixed(2)}</td>
          <td>${breakMin}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td>${distance}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /**
   * Format date/time for display
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
}
