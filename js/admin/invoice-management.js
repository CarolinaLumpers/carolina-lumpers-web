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
    const btnSyncToQBO = document.getElementById('btnSyncToQBO');
    const invoiceFilter = document.getElementById('invoiceWeekFilter');
    
    if (btnDryRun) {
      btnDryRun.addEventListener('click', () => this.runDryRun());
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
      
      // Fetch client names from Clients sheet for lookup
      let clientMap = {};
      try {
        const clientsUrl = `${this.sheetsApiUrl}/api/sheets/${this.spreadsheetId}/values/Clients!A2:B`;
        const clientsResponse = await fetch(clientsUrl);
        const clientsData = await clientsResponse.json();
        if (clientsData?.data?.values) {
          // Map ClientID (col A) to Client Name (col B)
          clientsData.data.values.forEach(row => {
            if (row[0] && row[1]) {
              clientMap[row[0]] = row[1]; // ClientID -> Client Name
            }
          });
          console.log('📊 Loaded client names:', clientMap);
        }
      } catch (error) {
        console.warn('⚠️ Could not load client names, using IDs:', error);
      }
      
      // Parse invoice rows
      this.invoices = rows
        .filter(row => row[0]) // Filter out empty rows
        .map(row => {
          const customerId = row[1] || '';
          const customerName = clientMap[customerId] || customerId; // Fallback to ID if not found
          
          return {
            invoiceNumber: row[0] || '',
            customerId: customerId,
            customer: customerName,
            date: row[2] || '',
            dueDate: row[3] || '',
            amount: parseFloat((row[4] || '0').replace(/[$,]/g, '')) || 0, // Strip $ and commas
            status: row[5] || 'Unpaid',
            synced: row[6] || 'No',
            pushToQBO: row[7] || 'Pending',
            lastUpdated: row[8] || ''
          };
        });

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
        <div class="invoice-summary-card success-card">
          <div class="summary-title success">✅ No unpaid invoices for ${weekLabel}</div>
          <div class="summary-text">
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
      <div class="invoice-summary-card">
        <h4 class="summary-title">📊 Week Summary: ${weekLabel} (Unpaid Invoices Only)</h4>
        <div class="summary-grid">
          <div class="summary-stat">
            <div class="stat-label">Unpaid Invoices</div>
            <div class="stat-value">${invoices.length}</div>
          </div>
          <div class="summary-stat">
            <div class="stat-label">Total Outstanding</div>
            <div class="stat-value danger">$${totalUnpaid.toFixed(2)}</div>
          </div>
          <div class="summary-stat">
            <div class="stat-label">Pending QBO Sync</div>
            <div class="stat-value warning">${pendingInvoices.length}</div>
          </div>
          <div class="summary-stat">
            <div class="stat-label">Already in QBO</div>
            <div class="stat-value success">${pushedInvoices.length}</div>
          </div>
        </div>
        ${pendingInvoices.length > 0 ? `
          <div class="summary-footer warning-footer">
            <div class="footer-title">⚠️ ${pendingInvoices.length} invoice(s) need to be synced to QuickBooks (Total: $${totalPending.toFixed(2)})</div>
            <div class="footer-text">Click "Sync to QuickBooks" to push these invoices to QBO</div>
          </div>
        ` : `
          <div class="summary-footer success-footer">
            <div class="footer-title">✅ All unpaid invoices for this week are already synced to QuickBooks</div>
            <div class="footer-text">Note: Paid invoices are automatically filtered out - they don't need syncing</div>
          </div>
        `}
      </div>

      <div class="invoice-table-wrapper">
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th class="hide-mobile">Date</th>
              <th>Amount</th>
              <th class="hide-mobile">Status</th>
              <th>QBO</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(inv => this.renderDryRunRow(inv)).join('')}
          </tbody>
        </table>
      </div>
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
      <tr>
        <td data-label="Invoice #" class="invoice-number">${invoice.invoiceNumber || '-'}</td>
        <td data-label="Customer">${invoice.customer || '-'}</td>
        <td data-label="Date" class="hide-mobile">${invoice.date || '-'}</td>
        <td data-label="Amount" class="amount">${amount}</td>
        <td data-label="Status" class="hide-mobile">${statusBadge}</td>
        <td data-label="QBO">${qboBadge}</td>
      </tr>
    `;
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

      // Track successful syncs with QB links
      const syncedInvoices = [];

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
            // Store QB invoice link if available
            if (data.qboInvoiceId) {
              const qboLink = `https://app.qbo.intuit.com/app/invoice?txnId=${data.qboInvoiceId}`;
              syncedInvoices.push({ invoiceNumber: invoice.invoiceNumber, qboLink });
            }
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

      // Show results with QB links
      let message = `Successfully synced ${successCount} invoice(s) to QuickBooks.`;
      
      if (syncedInvoices.length > 0) {
        message += '\n\nView in QuickBooks:';
        syncedInvoices.forEach(inv => {
          message += `\n• ${inv.invoiceNumber}: ${inv.qboLink}`;
        });
      }
      
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
