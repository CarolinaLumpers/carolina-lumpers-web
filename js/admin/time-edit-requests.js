/**
 * Time Edit Requests Module
 * Handles loading, approving, and denying time edit requests
 */

import { Dialog } from '../utils/dialog.js';

export class TimeEditRequests {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  /**
   * Initialize the Time Edit Requests manager
   */
  init() {
    const btnLoadPending = document.getElementById('btnLoadPendingEdits');
    const btnLoadAll = document.getElementById('btnLoadAllEdits');

    if (btnLoadPending) {
      btnLoadPending.addEventListener('click', () => this.loadRequests('pending'));
    }

    if (btnLoadAll) {
      btnLoadAll.addEventListener('click', () => this.loadRequests('all'));
    }
  }

  /**
   * Load time edit requests
   * @param {string} status - 'pending' or 'all'
   */
  async loadRequests(status = 'pending') {
    const container = document.getElementById('timeEditRequestsContainer');
    if (!container) return;

    container.innerHTML = '<p class="muted">Loading time edit requests...</p>';

    try {
      const url = `${this.apiUrl}?action=getTimeEditRequests&status=${status}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.ok || !data.requests || data.requests.length === 0) {
        container.innerHTML = `<p class="muted">No ${status} time edit requests found.</p>`;
        return;
      }

      this.renderRequestsTable(data.requests, container);
    } catch (err) {
      console.error('Error loading time edit requests:', err);
      container.innerHTML = '<p class="error">Failed to load requests. Please try again.</p>';
    }
  }

  /**
   * Render time edit requests as a table
   */
  renderRequestsTable(requests, container) {
    let html = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Record ID</th>
            <th>Original Time</th>
            <th>Requested Time</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    requests.forEach(req => {
      const isPending = req.status === 'pending';
      const statusClass = req.status === 'approved' ? 'status-confirmed' :
                         req.status === 'denied' ? 'status-denied' : 'status-pending';

      html += `
        <tr>
          <td>${this.escapeHtml(req.employeeName)}</td>
          <td>${this.escapeHtml(req.recordId)}</td>
          <td>${this.formatDateTime(req.originalTime)}</td>
          <td>${this.formatDateTime(req.requestedTime)}</td>
          <td>${this.escapeHtml(req.reason)}</td>
          <td><span class="status-badge ${statusClass}">${req.status}</span></td>
          <td>
            ${isPending ? `
              <button class="btn btn-success btn-sm" onclick="window.timeEditManager.approve('${req.requestId}')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="window.timeEditManager.deny('${req.requestId}')">Deny</button>
            ` : '—'}
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /**
   * Approve a time edit request
   */
  async approve(requestId) {
    const confirmed = await Dialog.confirm(
      'Approve Time Edit',
      'Are you sure you want to approve this time edit request?',
      { confirmText: 'Approve', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    try {
      const url = `${this.apiUrl}?action=approveTimeEdit&requestId=${encodeURIComponent(requestId)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        await Dialog.alert('Success', 'Time edit request approved successfully!');
        this.loadRequests('pending'); // Refresh the list
      } else {
        await Dialog.alert('Error', 'Failed to approve request: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error approving time edit:', err);
      await Dialog.alert('Error', 'Failed to approve request. Please try again.');
    }
  }

  /**
   * Deny a time edit request
   */
  async deny(requestId) {
    const reason = prompt('Enter reason for denial (optional):');
    if (reason === null) return; // User cancelled

    try {
      const url = `${this.apiUrl}?action=denyTimeEdit&requestId=${encodeURIComponent(requestId)}&reason=${encodeURIComponent(reason || 'No reason provided')}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        await Dialog.alert('Success', 'Time edit request denied.');
        this.loadRequests('pending'); // Refresh the list
      } else {
        await Dialog.alert('Error', 'Failed to deny request: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error denying time edit:', err);
      await Dialog.alert('Error', 'Failed to deny request. Please try again.');
    }
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
