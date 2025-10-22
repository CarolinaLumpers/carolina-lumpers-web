/**
 * QuickBooks Sync Module
 * Handles syncing active workers to QuickBooks Online as vendors
 */

export class QuickBooksSync {
  constructor() {
    this.syncApiUrl = 'https://vendorsync-proxy.s-garay.workers.dev';
  }

  /**
   * Initialize the QuickBooks Sync module
   */
  init() {
    const btnDryRun = document.getElementById('btnSyncVendorsDryRun');
    const btnLive = document.getElementById('btnSyncVendorsLive');

    if (btnDryRun) {
      btnDryRun.addEventListener('click', () => this.trigger(true));
    }

    if (btnLive) {
      btnLive.addEventListener('click', () => this.trigger(false));
    }
  }

  /**
   * Trigger vendor sync (dry run or live)
   * @param {boolean} dryRun - If true, preview changes without applying them
   */
  async trigger(dryRun = true) {
    const container = document.getElementById('qbSyncResultsContainer');
    const btnDryRun = document.getElementById('btnSyncVendorsDryRun');
    const btnLive = document.getElementById('btnSyncVendorsLive');

    // Confirm for live sync
    if (!dryRun) {
      const confirm = window.confirm(
        '⚠️ WARNING: This will ACTUALLY create/update vendors in QuickBooks Online.\n\n' +
        'Make sure you reviewed the dry run results first!\n\n' +
        'Continue with LIVE sync?'
      );
      if (!confirm) return;
    }

    // Disable buttons and show loading
    if (btnDryRun) btnDryRun.disabled = true;
    if (btnLive) btnLive.disabled = true;
    container.innerHTML = `<p class="muted">Running ${dryRun ? 'preview' : 'LIVE'} sync... Please wait.</p>`;
    container.style.display = 'block';

    try {
      const url = `${this.syncApiUrl}?action=syncVendors&dryRun=${dryRun}`;
      console.log('📤 Vendor sync request:', url);

      const response = await fetch(url);
      const data = await response.json();
      console.log('📥 Vendor sync response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Vendor sync failed');
      }

      this.renderResults(data, dryRun, container);

    } catch (err) {
      console.error('Vendor sync error:', err);
      container.innerHTML = `
        <div class="error-box">
          <h4>❌ Sync Failed</h4>
          <p>${err.message || err}</p>
          <p>Check browser console for details.</p>
        </div>
      `;
    } finally {
      // Re-enable buttons
      if (btnDryRun) btnDryRun.disabled = false;
      if (btnLive) btnLive.disabled = false;
    }
  }

  /**
   * Render sync results
   */
  renderResults(data, dryRun, container) {
    const { counts, logs, summary } = data;

    let html = `
      <div class="sync-results">
        <h4>${dryRun ? '🔍 Preview Results (Dry Run)' : '✅ Live Sync Complete'}</h4>
        
        <div class="sync-summary">
          <div class="summary-item">
            <span class="count">${counts.created || 0}</span>
            <span class="label">Created</span>
          </div>
          <div class="summary-item">
            <span class="count">${counts.updated || 0}</span>
            <span class="label">Updated</span>
          </div>
          <div class="summary-item">
            <span class="count">${counts.noChange || 0}</span>
            <span class="label">No Change</span>
          </div>
          <div class="summary-item error">
            <span class="count">${counts.failed || 0}</span>
            <span class="label">Failed</span>
          </div>
        </div>

        <p class="summary-text">${this.escapeHtml(summary)}</p>

        ${dryRun ? `
          <div class="info-box">
            <strong>ℹ️ This was a preview.</strong>
            No changes were made to QuickBooks.
            Review the logs below, then click "Run Sync (Live)" to apply changes.
          </div>
        ` : ''}

        <details class="sync-logs">
          <summary>View Detailed Logs (${logs?.length || 0} entries)</summary>
          <div class="log-content">
            ${logs && logs.length > 0 ? logs.map(log => `<p>${this.escapeHtml(log)}</p>`).join('') : '<p>No logs available</p>'}
          </div>
        </details>
      </div>
    `;

    container.innerHTML = html;
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
