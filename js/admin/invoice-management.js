/**
 * Invoice Management Module
 * Handles invoice viewing, email sending, and QBO sync
 */

import { Dialog } from '../utils/dialog.js?v=2024-dialog-fix';

export class InvoiceManagement {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    // Use Cloudflare proxy for InvoiceProject (like payroll)
    this.invoiceApiUrl = 'https://invoice-proxy.s-garay.workers.dev';
    this.sheetsApiUrl = 'https://sheets-direct-proxy.steve-3d1.workers.dev';
    this.spreadsheetId = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
  }

  /**
   * Initialize the Invoice Management module
   */
  init() {
    const btnDryRun = document.getElementById('btnDryRun');
    const btnRefreshPaymentStatus = document.getElementById('btnRefreshPaymentStatus');
    const btnSyncToQBO = document.getElementById('btnSyncToQBO');
    const invoiceFilter = document.getElementById('invoiceWeekFilter');
    
    if (btnDryRun) {
      btnDryRun.addEventListener('click', () => this.runDryRun());
    }

    if (btnRefreshPaymentStatus) {
      btnRefreshPaymentStatus.addEventListener('click', () => this.refreshPaymentStatus());
    }

    if (btnSyncToQBO) {
      btnSyncToQBO.addEventListener('click', () => this.syncWeekToQBO());
    }

    if (invoiceFilter) {
      invoiceFilter.addEventListener('change', () => {
        // Clear preview when week changes
        const container = document.getElementById('invoiceList');
        if (container) container.innerHTML = '';
      });
    }

    // Populate week selector with Saturdays (like Run Payroll)
    this.populateWeekSelector();
  }

  /**
   * Populate the week period selector with last 4 Saturdays (like Run Payroll)
   */
  populateWeekSelector() {
    const dropdown = document.getElementById('invoiceWeekFilter');
    if (!dropdown) return;
    
    const weeks = [];
    const today = new Date();
    
    // Generate 4 Saturdays: This week and last 3 weeks
    for (let i = 0; i < 4; i++) {
      const date = new Date(today);
      const dayOfWeek = date.getDay();
      const daysToSaturday = (6 - dayOfWeek + 7) % 7;
      date.setDate(date.getDate() + daysToSaturday - (i * 7));
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      const saturday = `${month}/${day}/${year}`;
      
      weeks.push(saturday);
    }
    
    // Build dropdown with week options
    const options = weeks.map((sat, index) => {
      let tag = '';
      if (index === 0) tag = ' (This Week)';
      else if (index === 1) tag = ' (Last Week)';
      return `<option value="${sat}">${sat}${tag}</option>`;
    }).join('');
    
    dropdown.innerHTML = '<option value="">-- All Invoices --</option>' + options;
    
    // Auto-select last week (index 1) as default
    dropdown.value = weeks[1];
  }

  /**
   * Run dry run - preview invoices for selected week
   */
  async runDryRun() {
    console.log('📦 runDryRun() called');
    
    const container = document.getElementById('invoiceList');
    const button = document.getElementById('btnDryRun');
    const weekFilter = document.getElementById('invoiceWeekFilter');
    
    if (!container) {
      console.error('❌ Container not found, aborting');
      return;
    }

    if (!weekFilter || !weekFilter.value) {
      await Dialog.alert('Select Week Period', 'Please select a week period from the dropdown first.');
      return;
    }

    const selectedWeek = weekFilter.value;

    // Show loading state
    container.innerHTML = '<p class="muted">Loading invoices for selected week...</p>';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span>Loading...</span>';
    }

    try {
      // Fetch directly from Invoices sheet via Sheets API proxy
      const url = `${this.sheetsApiUrl}/api/sheets/${this.spreadsheetId}/values/Invoices!A2:I`;
      console.log('📊 Fetching invoices from:', url);
      
      const response = await fetch(url);
      console.log('📊 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Response data:', data);

      // Handle both success formats: {ok: true} and {success: true}
      if (!data || (!data.success && !data.ok)) {
        throw new Error(data?.message || data?.error || 'Failed to load invoices');
      }

      const rows = data.data?.values || [];
      
      // Parse invoice rows
      this.invoices = rows
        .filter(row => row[0]) // Filter out empty rows
        .map(row => ({
          invoiceNumber: row[0] || '',
          customer: row[1] || '',
          date: row[2] || '',
          dueDate: row[3] || '',
          amount: parseFloat((row[4] || '0').replace(/[$,]/g, '')) || 0, // Strip $ and commas
          status: row[5] || 'Unpaid',
          synced: row[6] || 'No',
          pushToQBO: row[7] || 'Pending',
          lastUpdated: row[8] || ''
        }));

      // Filter by selected week
      const [month, day, year] = selectedWeek.split('/');
      const saturday = new Date(year, month - 1, day);
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() - 6);

      console.log(`📅 Selected week: ${selectedWeek}`);
      console.log(`📅 Date range: ${sunday.toLocaleDateString()} to ${saturday.toLocaleDateString()}`);

      let weekInvoices = this.invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= sunday && invDate <= saturday;
      });

      console.log(`📊 Invoices in date range: ${weekInvoices.length}`);
      console.log(`📊 Status breakdown:`, weekInvoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {}));

      // Filter out paid invoices by default (they don't need to sync)
      // Only show unpaid invoices that need attention
      const beforeFilter = weekInvoices.length;
      weekInvoices = weekInvoices.filter(inv => inv.status !== 'Paid');
      console.log(`📊 After filtering out paid: ${weekInvoices.length} (removed ${beforeFilter - weekInvoices.length} paid invoices)`);

      // Sort by date descending (newest first)
      weekInvoices.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      this.renderDryRunSummary(weekInvoices, selectedWeek);

    } catch (err) {
      console.error('Failed to load invoices:', err);
      container.innerHTML = `<p class="muted" style="color:#f44336;">Error: ${err.message}</p>`;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span>🔍 Dry Run (Preview)</span>';
      }
    }
  }

  /**
   * Render dry run summary with totals and pending status
   */
  renderDryRunSummary(invoices, weekLabel) {
    const container = document.getElementById('invoiceList');
    if (!container) return;

    if (!invoices || invoices.length === 0) {
      container.innerHTML = `
        <div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:8px;padding:16px;margin-top:12px;">
          <div style="color:#4CAF50;font-weight:600;">✅ No unpaid invoices for ${weekLabel}</div>
          <div style="color:#999;font-size:14px;margin-top:8px;">
            All invoices for this week are either paid or don't exist.<br>
            Paid invoices are automatically filtered out since they don't need syncing.
          </div>
        </div>
      `;
      return;
    }

    // Calculate totals
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const pendingInvoices = invoices.filter(inv => inv.pushToQBO === 'Pending');
    const pushedInvoices = invoices.filter(inv => inv.pushToQBO === 'Pushed');
    const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue');
    const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const html = `
      <div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:8px;padding:16px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;color:#FFC107;font-size:16px;">📊 Week Summary: ${weekLabel} (Unpaid Invoices Only)</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          <div>
            <div style="color:#999;font-size:12px;">Unpaid Invoices</div>
            <div style="font-size:24px;font-weight:600;">${invoices.length}</div>
          </div>
          <div>
            <div style="color:#999;font-size:12px;">Total Outstanding</div>
            <div style="font-size:24px;font-weight:600;color:#f44336;">$${totalUnpaid.toFixed(2)}</div>
          </div>
          <div>
            <div style="color:#999;font-size:12px;">Pending QBO Sync</div>
            <div style="font-size:24px;font-weight:600;color:#FFC107;">${pendingInvoices.length}</div>
          </div>
          <div>
            <div style="color:#999;font-size:12px;">Already in QBO</div>
            <div style="font-size:24px;font-weight:600;color:#4CAF50;">${pushedInvoices.length}</div>
          </div>
        </div>
        ${pendingInvoices.length > 0 ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,193,7,0.2);">
            <div style="color:#FFC107;font-weight:600;">⚠️ ${pendingInvoices.length} invoice(s) need to be synced to QuickBooks (Total: $${totalPending.toFixed(2)})</div>
            <div style="color:#999;font-size:12px;margin-top:4px;">Click "Sync to QuickBooks" to push these invoices to QBO</div>
          </div>
        ` : `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(76,175,80,0.2);">
            <div style="color:#4CAF50;font-weight:600;">✅ All unpaid invoices for this week are already synced to QuickBooks</div>
            <div style="color:#999;font-size:12px;margin-top:4px;">Note: Paid invoices are automatically filtered out - they don't need syncing</div>
          </div>
        `}
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:rgba(255,193,7,0.1);border-bottom:2px solid rgba(255,193,7,0.3);">
            <th style="padding:10px;text-align:left;">Invoice #</th>
            <th style="padding:10px;text-align:left;">Customer</th>
            <th style="padding:10px;text-align:left;">Date</th>
            <th style="padding:10px;text-align:right;">Amount</th>
            <th style="padding:10px;text-align:center;">Status</th>
            <th style="padding:10px;text-align:center;">QBO Status</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map(inv => this.renderDryRunRow(inv)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  /**
   * Render a single dry run invoice row
   */
  renderDryRunRow(invoice) {
    const statusBadge = this.getStatusBadge(invoice.status);
    const qboBadge = this.getQBOBadge(invoice.pushToQBO);
    const amount = invoice.amount ? `$${invoice.amount.toFixed(2)}` : '-';

    return `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:10px;font-family:monospace;">${invoice.invoiceNumber || '-'}</td>
        <td style="padding:10px;">${invoice.customer || '-'}</td>
        <td style="padding:10px;">${invoice.date || '-'}</td>
        <td style="padding:10px;text-align:right;font-weight:600;">${amount}</td>
        <td style="padding:10px;text-align:center;">${statusBadge}</td>
        <td style="padding:10px;text-align:center;">${qboBadge}</td>
      </tr>
    `;
  }

  /**
   * Manually trigger payment status check from QuickBooks
   * Calls the Apps Script daily payment check function on-demand
   */
  async refreshPaymentStatus() {
    console.log('🔄 refreshPaymentStatus() called');
    
    const confirmed = await Dialog.confirm(
      'Check Payment Status',
      'Query QuickBooks Online to update payment status for all unpaid invoices?\n\nThis will check if any invoices have been paid and update their status in the system.',
      { confirmText: 'Check Now', cancelText: 'Cancel' }
    );
    
    if (!confirmed) {
      console.log('❌ User cancelled payment status check');
      return;
    }

    try {
      console.log('📞 Calling InvoiceProject to check payment status...');
      this.showLoading('Checking payment status from QuickBooks...');

      // Call InvoiceProject to run payment status check
      const payload = {
        event: 'Check_Payment_Status'
      };

      console.log('📤 Sending payload:', payload);
      console.log('📍 API URL:', this.invoiceApiUrl);

      const response = await fetch(this.invoiceApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📊 Response data:', data);

      this.hideLoading();

      if (!data || data.status === '❌ Error') {
        console.error('❌ Payment check failed:', data);
        throw new Error(data?.message || 'Failed to check payment status');
      }

      console.log('✅ Payment status check completed successfully');

      await Dialog.alert(
        'Payment Status Updated',
        'Successfully checked QuickBooks for payment updates.\n\nRefreshing invoice data to show updated statuses...'
      );

      // Give Apps Script a moment to finish writing to Sheets
      console.log('⏳ Waiting 2 seconds for Sheets to update...');
      this.showLoading('Reloading invoice data from Sheets...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear cached data and reload from Sheets to get updated statuses
      console.log('🗑️ Clearing cached invoice data');
      this.invoices = null;
      
      // Auto-run dry run to show fresh data with updated payment statuses
      const weekFilter = document.getElementById('invoiceWeekFilter');
      if (weekFilter && weekFilter.value) {
        console.log('🔄 Auto-running dry run to show updated data...');
        await this.runDryRun();
      } else {
        console.log('⚠️ No week selected, skipping auto-refresh');
        this.hideLoading();
      }

      console.log('✅ Payment status refresh complete');

    } catch (err) {
      this.hideLoading();
      console.error('❌ Failed to refresh payment status:', err);
      console.error('Error details:', err.stack);
      await Dialog.alert('Error', err.message);
    }
  }

  /**
   * Sync entire week to QuickBooks (live run)
   */
  async syncWeekToQBO() {
    const weekFilter = document.getElementById('invoiceWeekFilter');
    
    if (!weekFilter || !weekFilter.value) {
      await Dialog.alert('Select Week Period', 'Please select a week period and run Dry Run first to preview.');
      return;
    }

    if (!this.invoices || this.invoices.length === 0) {
      await Dialog.alert('Run Dry Run First', 'Please click "Dry Run (Preview)" first to load and preview the invoices.');
      return;
    }

    const selectedWeek = weekFilter.value;
    
    // Filter by selected week
    const [month, day, year] = selectedWeek.split('/');
    const saturday = new Date(year, month - 1, day);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() - 6);

    let weekInvoices = this.invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= sunday && invDate <= saturday;
    });

    // Filter out paid invoices (they don't need to sync)
    weekInvoices = weekInvoices.filter(inv => inv.status !== 'Paid');

    const pendingInvoices = weekInvoices.filter(inv => inv.pushToQBO === 'Pending');

    if (pendingInvoices.length === 0) {
      await Dialog.alert('Nothing to Sync', 'All invoices for this week are already synced to QuickBooks.');
      return;
    }

    const totalAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const confirmed = await Dialog.confirm(
      'Sync to QuickBooks',
      `Push ${pendingInvoices.length} pending invoice(s) to QuickBooks Online?\n\nTotal Amount: $${totalAmount.toFixed(2)}\nWeek: ${selectedWeek}\n\nThis action cannot be undone.`,
      { 
        confirmText: 'Sync to QBO', 
        cancelText: 'Cancel',
        variant: 'destructive'
      }
    );
    
    if (!confirmed) return;

    try {
      this.showLoading(`Syncing ${pendingInvoices.length} invoice(s) to QuickBooks...`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Sync each pending invoice with progress updates
      for (let i = 0; i < pendingInvoices.length; i++) {
        const invoice = pendingInvoices[i];
        const progress = i + 1;
        const total = pendingInvoices.length;
        
        // Update loading message with progress
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
          loadingText.textContent = `Syncing ${progress}/${total}: ${invoice.invoiceNumber} ($${invoice.amount.toFixed(2)})...`;
        }
        
        console.log(`📤 [${progress}/${total}] Syncing invoice ${invoice.invoiceNumber}`);

        try {
          const payload = {
            event: 'QBO_Approval',
            invoiceNumber: invoice.invoiceNumber
          };

          const response = await fetch(this.invoiceApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await response.json();

          if (data && data.status !== '❌ Error') {
            successCount++;
            console.log(`✅ [${progress}/${total}] ${invoice.invoiceNumber} synced successfully`);
          } else {
            errorCount++;
            const errorMsg = data?.message || 'Unknown error';
            errors.push(`${invoice.invoiceNumber}: ${errorMsg}`);
            console.error(`❌ [${progress}/${total}] ${invoice.invoiceNumber} failed: ${errorMsg}`);
          }
        } catch (err) {
          errorCount++;
          errors.push(`${invoice.invoiceNumber}: ${err.message}`);
          console.error(`❌ [${progress}/${total}] ${invoice.invoiceNumber} error: ${err.message}`);
        }
        
        // Small delay between requests to avoid rate limiting
        if (i < pendingInvoices.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      this.hideLoading();

      // Show results
      let message = `Successfully synced ${successCount} invoice(s) to QuickBooks.`;
      if (errorCount > 0) {
        message += `\n\n${errorCount} invoice(s) failed:\n${errors.join('\n')}`;
      }

      await Dialog.alert(
        errorCount > 0 ? 'Sync Completed with Errors' : 'Sync Completed',
        message
      );

      // Refresh the dry run to show updated status
      await this.runDryRun();

    } catch (err) {
      this.hideLoading();
      console.error('Failed to sync invoices:', err);
      await Dialog.alert('Error', err.message);
    }
  }

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const badges = {
      'Unpaid': '<span style="background:rgba(255,193,7,0.2);color:#FFC107;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">UNPAID</span>',
      'Paid': '<span style="background:rgba(76,175,80,0.2);color:#4CAF50;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">PAID</span>',
      'Overdue': '<span style="background:rgba(244,67,54,0.2);color:#f44336;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">OVERDUE</span>',
      'Pending': '<span style="background:rgba(255,193,7,0.2);color:#FFC107;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">PENDING</span>'
    };
    return badges[status] || '<span style="color:#999;">-</span>';
  }

  /**
   * Get QBO status badge HTML
   */
  getQBOBadge(pushToQBO) {
    if (pushToQBO === 'Pushed') {
      return '<span style="background:rgba(76,175,80,0.2);color:#4CAF50;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">✓ SYNCED</span>';
    } else if (pushToQBO === 'Pending') {
      return '<span style="background:rgba(255,193,7,0.2);color:#FFC107;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">⏳ PENDING</span>';
    }
    return '<span style="color:#999;">-</span>';
  }



  /**
   * Show loading overlay
   */
  showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (overlay) {
      overlay.classList.add('active');
      if (text) text.textContent = message;
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }
}
