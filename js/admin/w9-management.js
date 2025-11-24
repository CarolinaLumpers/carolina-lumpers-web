/**
 * W9 Management Module
 * Handles W-9 form review, approval, and rejection
 */

import { Dialog } from '../utils/dialog.js?v=2024-dialog-fix';

export class W9Management {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  /**
   * Initialize the W9 Management module
   */
  init() {
    const btnLoadPendingW9s = document.getElementById('btnLoadPendingW9s');
    
    if (btnLoadPendingW9s) {
      btnLoadPendingW9s.addEventListener('click', () => this.loadPendingW9s());
    }
  }

  /**
   * Load pending W-9 submissions
   */
  async loadPendingW9s() {
    const container = document.getElementById('w9List');
    const button = document.getElementById('btnLoadPendingW9s');
    
    if (!container) return;

    // Show loading state
    container.innerHTML = '<p class="muted">Loading pending W-9 submissions...</p>';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span>Loading...</span>';
    }

    try {
      const response = await fetch(`${this.apiUrl}?action=listPendingW9s`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Failed to load W-9 submissions');
      }

      this.renderW9List(data.pending || []);

    } catch (err) {
      console.error('Failed to load W-9s:', err);
      container.innerHTML = `<p class="muted" style="color:#f44336;">Error: ${err.message}</p>`;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<i data-feather="refresh-cw" class="w-4 h-4"></i><span>Load Pending W-9s</span>';
        // Re-render Feather icons
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      }
    }
  }

  /**
   * Render W-9 list
   */
  renderW9List(w9s) {
    const container = document.getElementById('w9List');
    if (!container) return;

    if (!w9s || w9s.length === 0) {
      container.innerHTML = `
        <div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:8px;padding:16px;">
          <div style="color:#4CAF50;font-weight:600;">✅ No pending W-9 submissions</div>
          <div style="color:#999;font-size:14px;margin-top:8px;">
            All W-9 forms have been reviewed.
          </div>
        </div>
      `;
      return;
    }

    const html = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(255,193,7,0.1);border-bottom:2px solid rgba(255,193,7,0.3);">
            <th style="padding:10px;text-align:left;">Worker</th>
            <th style="padding:10px;text-align:left;">Legal Name</th>
            <th style="padding:10px;text-align:left;">Tax Classification</th>
            <th style="padding:10px;text-align:left;">Submitted</th>
            <th style="padding:10px;text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${w9s.map(w9 => this.renderW9Row(w9)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  /**
   * Render a single W-9 row
   */
  renderW9Row(w9) {
    const submittedDate = w9.submittedDate ? new Date(w9.submittedDate).toLocaleDateString() : '-';
    
    return `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:10px;">
          <div style="font-weight:600;">${w9.displayName || '-'}</div>
          <div style="font-size:12px;color:#999;">${w9.workerId || '-'}</div>
        </td>
        <td style="padding:10px;">${w9.legalName || '-'}</td>
        <td style="padding:10px;">${w9.taxClassification || '-'}</td>
        <td style="padding:10px;">${submittedDate}</td>
        <td style="padding:10px;text-align:center;">
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            ${w9.pdfUrl ? `
              <button class="btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="window.open('${w9.pdfUrl}', '_blank')">
                <i data-feather="external-link" class="w-3 h-3"></i>
                <span>View PDF</span>
              </button>
            ` : ''}
            <button class="btn-primary" style="padding:6px 12px;font-size:12px;" onclick="window.w9Manager.approveW9('${w9.w9RecordId}', '${w9.workerId}', '${w9.displayName}')">
              <i data-feather="check" class="w-3 h-3"></i>
              <span>Approve</span>
            </button>
            <button class="btn-secondary" style="padding:6px 12px;font-size:12px;background:#f44336;color:#fff;" onclick="window.w9Manager.rejectW9('${w9.w9RecordId}', '${w9.workerId}', '${w9.displayName}')">
              <i data-feather="x" class="w-3 h-3"></i>
              <span>Reject</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Approve a W-9 submission
   */
  async approveW9(w9RecordId, workerId, displayName) {
    const confirmed = await Dialog.confirm(
      'Approve W-9',
      `Approve W-9 for ${displayName} (${workerId})?\n\nThis will mark the W-9 as approved and notify the worker.`,
      { confirmText: 'Approve', cancelText: 'Cancel', variant: 'default' }
    );
    
    if (!confirmed) return;

    try {
      this.showLoading('Approving W-9...');

      const adminId = localStorage.getItem('CLS_WorkerID');
      const deviceInfo = typeof getDeviceInfo === 'function' ? getDeviceInfo() : { displayString: 'Unknown' };
      
      const url = `${this.apiUrl}?action=approveW9&w9RecordId=${encodeURIComponent(w9RecordId)}&adminId=${encodeURIComponent(adminId)}&device=${encodeURIComponent(deviceInfo.displayString)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      this.hideLoading();

      if (!data.ok) {
        throw new Error(data.message || 'Failed to approve W-9');
      }

      await Dialog.alert(
        '✅ W-9 Approved',
        `W-9 for ${displayName} has been approved successfully.`
      );

      // Reload the list
      await this.loadPendingW9s();

    } catch (err) {
      this.hideLoading();
      console.error('Failed to approve W-9:', err);
      await Dialog.alert('Error', err.message);
    }
  }

  /**
   * Reject a W-9 submission
   */
  async rejectW9(w9RecordId, workerId, displayName) {
    // Prompt for rejection reason
    const reason = prompt(`Enter reason for rejecting ${displayName}'s W-9:`);
    
    if (!reason || !reason.trim()) {
      await Dialog.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }

    const confirmed = await Dialog.confirm(
      '⚠️ Reject W-9',
      `Reject W-9 for ${displayName} (${workerId})?\n\nReason: ${reason}\n\nThe worker will need to resubmit.`,
      { confirmText: 'Reject', cancelText: 'Cancel', variant: 'destructive' }
    );
    
    if (!confirmed) return;

    try {
      this.showLoading('Rejecting W-9...');

      const adminId = localStorage.getItem('CLS_WorkerID');
      const deviceInfo = typeof getDeviceInfo === 'function' ? getDeviceInfo() : { displayString: 'Unknown' };
      
      const url = `${this.apiUrl}?action=rejectW9&w9RecordId=${encodeURIComponent(w9RecordId)}&adminId=${encodeURIComponent(adminId)}&reason=${encodeURIComponent(reason)}&device=${encodeURIComponent(deviceInfo.displayString)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      this.hideLoading();

      if (!data.ok) {
        throw new Error(data.message || 'Failed to reject W-9');
      }

      await Dialog.alert(
        'W-9 Rejected',
        `W-9 for ${displayName} has been rejected.\n\nThe worker will be notified.`
      );

      // Reload the list
      await this.loadPendingW9s();

    } catch (err) {
      this.hideLoading();
      console.error('Failed to reject W-9:', err);
      await Dialog.alert('Error', err.message);
    }
  }

  /**
   * Show loading overlay
   */
  showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (overlay) {
      overlay.style.display = 'block';
      if (text) text.textContent = message;
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}
