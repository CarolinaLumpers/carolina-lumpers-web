/**
 * Invoice Management Module
 * Handles invoice viewing, email sending, and QBO sync
 */

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
    const btnLoadInvoices = document.getElementById('btnLoadInvoices');
    const btnRefreshInvoices = document.getElementById('btnRefreshInvoices');
    const invoiceFilter = document.getElementById('invoiceDateFilter');
    
    if (btnLoadInvoices) {
      btnLoadInvoices.addEventListener('click', () => this.loadInvoices());
    }

    if (btnRefreshInvoices) {
      btnRefreshInvoices.addEventListener('click', () => this.loadInvoices());
    }

    if (invoiceFilter) {
      invoiceFilter.addEventListener('change', () => this.filterInvoices());
    }

    console.log('✅ Invoice Management initialized');
  }

  /**
   * Load all invoices from Google Sheets (Direct Sheets API)
   */
  async loadInvoices() {
    const container = document.getElementById('invoiceContainer');
    const button = document.getElementById('btnLoadInvoices');
    
    if (!container) return;

    // Show loading state
    container.innerHTML = '<p class="muted">Loading invoices...</p>';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span>Loading...</span>';
    }

    try {
      // Fetch directly from Invoices sheet via Sheets API proxy
      const url = `${this.sheetsApiUrl}/api/sheets/${this.spreadsheetId}/values/Invoices!A2:I`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to load invoices');
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
          amount: row[4] || 0,
          status: row[5] || 'Unpaid',
          synced: row[6] || 'No',
          pushToQBO: row[7] || 'Pending',
          lastUpdated: row[8] || ''
        }));

      // Sort by date descending (newest first)
      this.invoices.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      this.renderInvoices(this.invoices);

    } catch (err) {
      console.error('Failed to load invoices:', err);
      container.innerHTML = `<p class="muted" style="color:#f44336;">Error: ${err.message}</p>`;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span data-en="Load Invoices" data-es="Cargar Facturas" data-pt="Carregar Faturas">Load Invoices</span>';
      }
    }
  }

  /**
   * Filter invoices by date range
   */
  filterInvoices() {
    const filter = document.getElementById('invoiceDateFilter');
    if (!filter || !this.invoices) return;

    const selectedRange = filter.value;
    
    let filtered = this.invoices;
    if (selectedRange !== 'all') {
      const now = new Date();
      const ranges = {
        'last_week': () => {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return weekAgo;
        },
        'this_month': () => {
          return new Date(now.getFullYear(), now.getMonth(), 1);
        },
        'last_month': () => {
          return new Date(now.getFullYear(), now.getMonth() - 1, 1);
        },
        'last_3_months': () => {
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return threeMonthsAgo;
        }
      };

      const startDate = ranges[selectedRange]();
      filtered = this.invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= startDate;
      });
    }

    this.renderInvoices(filtered);
  }

  /**
   * Render invoices table
   */
  renderInvoices(invoices) {
    const container = document.getElementById('invoiceContainer');
    if (!container) return;

    if (!invoices || invoices.length === 0) {
      container.innerHTML = '<p class="muted">No invoices found</p>';
      return;
    }

    const html = `
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:rgba(255,193,7,0.1);border-bottom:2px solid rgba(255,193,7,0.3);">
            <th style="padding:10px;text-align:left;">Invoice #</th>
            <th style="padding:10px;text-align:left;">Customer</th>
            <th style="padding:10px;text-align:left;">Date</th>
            <th style="padding:10px;text-align:right;">Amount</th>
            <th style="padding:10px;text-align:center;">Status</th>
            <th style="padding:10px;text-align:center;">QBO</th>
            <th style="padding:10px;text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map(inv => this.renderInvoiceRow(inv)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  /**
   * Render a single invoice row
   */
  renderInvoiceRow(invoice) {
    const statusBadge = this.getStatusBadge(invoice.status);
    const qboBadge = this.getQBOBadge(invoice.pushToQBO);
    const amount = invoice.amount ? `$${parseFloat(invoice.amount).toFixed(2)}` : '-';

    return `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:10px;font-family:monospace;">${invoice.invoiceNumber || '-'}</td>
        <td style="padding:10px;">${invoice.customer || '-'}</td>
        <td style="padding:10px;">${invoice.date || '-'}</td>
        <td style="padding:10px;text-align:right;font-weight:600;">${amount}</td>
        <td style="padding:10px;text-align:center;">${statusBadge}</td>
        <td style="padding:10px;text-align:center;">${qboBadge}</td>
        <td style="padding:10px;text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button 
              class="btn btn-ghost" 
              style="padding:6px 10px;font-size:12px;"
              onclick="window.invoiceManager.sendInvoiceEmail('${invoice.invoiceNumber}')"
              title="Send invoice via email">
              📧 Email
            </button>
            <button 
              class="btn btn-ghost" 
              style="padding:6px 10px;font-size:12px;"
              onclick="window.invoiceManager.syncToQBO('${invoice.invoiceNumber}')"
              title="Sync to QuickBooks">
              🔄 Sync
            </button>
          </div>
        </td>
      </tr>
    `;
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
   * Send invoice via email (calls InvoiceProject)
   */
  async sendInvoiceEmail(invoiceNumber) {
    const confirm = window.confirm(
      `Send invoice ${invoiceNumber} to client?\n\n` +
      `This will generate a PDF and email it to the client's payables email address.`
    );
    if (!confirm) return;

    try {
      // Show loading overlay
      this.showLoading(`Sending invoice ${invoiceNumber}...`);

      // Call InvoiceProject to send email
      const payload = {
        action: 'sendInvoiceEmail',
        invoiceNumber: invoiceNumber
      };

      const response = await fetch(this.invoiceApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      this.hideLoading();

      if (!data || data.status === '❌ Error') {
        throw new Error(data?.message || 'Failed to send invoice');
      }

      alert(`✅ Invoice ${invoiceNumber} sent successfully!`);
      this.loadInvoices(); // Refresh the list

    } catch (err) {
      this.hideLoading();
      console.error('Failed to send invoice:', err);
      alert(`❌ Error: ${err.message}`);
    }
  }

  /**
   * Sync invoice to QuickBooks (calls InvoiceProject)
   */
  async syncToQBO(invoiceNumber) {
    const confirm = window.confirm(
      `Sync invoice ${invoiceNumber} to QuickBooks Online?\n\n` +
      `This will create or update the invoice in QBO.`
    );
    if (!confirm) return;

    try {
      // Show loading overlay
      this.showLoading(`Syncing invoice ${invoiceNumber} to QBO...`);

      // Call InvoiceProject to sync to QBO
      const payload = {
        event: 'QBO_Approval',
        invoiceNumber: invoiceNumber
      };

      const response = await fetch(this.invoiceApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      this.hideLoading();

      if (!data || data.status === '❌ Error') {
        throw new Error(data?.message || 'Failed to sync invoice');
      }

      alert(`✅ Invoice ${invoiceNumber} synced to QuickBooks successfully!`);
      
      // Wait a moment for backend to update, then refresh
      setTimeout(() => this.loadInvoices(), 1500);

    } catch (err) {
      this.hideLoading();
      console.error('Failed to sync invoice:', err);
      alert(`❌ Error: ${err.message}`);
    }
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
