/**
 * Run Payroll Module
 * Handles weekly payroll processing and week period selection
 */

import { Dialog } from '../utils/dialog.js?v=2024-dialog-fix';

export class RunPayroll {
  constructor() {
    this.payrollApiUrl = 'https://payroll-proxy.s-garay.workers.dev';
  }

  /**
   * Initialize the Run Payroll module
   */
  init() {
    const btnRunPayroll = document.getElementById('btnRunPayroll');
    
    if (btnRunPayroll) {
      btnRunPayroll.addEventListener('click', () => this.trigger());
    }

    this.populateWeekSelector();
  }

  /**
   * Populate the week period selector with last 2 Saturdays
   */
  populateWeekSelector() {
    const dropdown = document.getElementById('runPayrollWeekSelect');
    if (!dropdown) return;
    
    const weeks = [];
    const today = new Date();
    
    // Generate last 2 Saturdays
    for (let i = 0; i < 2; i++) {
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
    
    dropdown.innerHTML = '<option value="">-- Select Week --</option>' + 
      weeks.map((sat, index) => {
        const tag = index === 0 ? ' (This Week)' : ' (Last Week)';
        return `<option value="${sat}">${sat}${tag}</option>`;
      }).join('');
    
    // Auto-select last week as that's typical for payroll
    dropdown.value = weeks[1];
  }

  /**
   * Trigger payroll processing
   */
  async trigger() {
    const dropdown = document.getElementById('runPayrollWeekSelect');
    const weekPeriod = dropdown?.value;
    
    if (!weekPeriod) {
      await Dialog.alert('Week Period Required', 'Please select a week period first');
      return;
    }

    // Confirm before running
    const confirmed = await Dialog.confirm(
      '⚠️ WARNING: Process Payroll',
      `This will process payroll for ALL ACTIVE WORKERS and create bills in QuickBooks Online.\n\nWeek Period: ${weekPeriod}\n\nThis action cannot be undone. Continue?`,
      { confirmText: 'Run Payroll', cancelText: 'Cancel', variant: 'destructive' }
    );
    if (!confirmed) return;

    try {
      this.showLoading('Processing payroll for all active workers...');

      const payload = {
        "Webhook Type": "Run Payroll",
        "Week Period": weekPeriod
      };

      const response = await fetch(this.payrollApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      this.hideLoading();

      if (!data || (data.status && data.status !== 200)) {
        throw new Error(data?.message || 'Payroll processing failed');
      }

      // Display summary
      if (data.summary) {
        this.displayPayrollSummary(data.summary);
      }

      // Success alert
      await Dialog.alert(
        '✅ Payroll Complete',
        `Payroll processed successfully for week ${weekPeriod}.\n\n${data.summary?.bills.length || 0} bills created/updated.\nTotal: $${(data.summary?.totalAmount || 0).toFixed(2)}`
      );

    } catch (err) {
      this.hideLoading();
      console.error('Payroll error:', err);
      await Dialog.alert(
        '❌ Payroll Failed',
        `Error: ${err.message || err}\n\nCheck that PayrollProject script is deployed and accessible.`
      );
    }
  }

  /**
   * Display payroll summary in the results section
   */
  displayPayrollSummary(summary) {
    const resultsDiv = document.getElementById('payrollResults');
    const contentDiv = document.getElementById('payrollContent');
    
    if (!resultsDiv || !contentDiv) return;

    // Sort bills by amount (highest first)
    const bills = summary.bills || [];
    bills.sort((a, b) => b.amount - a.amount);

    const html = `
      <div class="space-y-4">
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="text-sm text-muted-foreground">Week Period</div>
            <div class="text-lg font-semibold">${summary.weekPeriod}</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div class="text-sm text-muted-foreground">Bills Created</div>
            <div class="text-lg font-semibold">${bills.length}</div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div class="text-sm text-muted-foreground">Total Amount</div>
            <div class="text-lg font-semibold">$${summary.totalAmount.toFixed(2)}</div>
          </div>
        </div>

        <!-- Bills List -->
        <div class="space-y-2">
          ${bills.map(bill => `
            <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">${bill.workerName}</div>
                <div class="text-xs text-muted-foreground truncate">${bill.checkNumber}</div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <span class="text-sm font-semibold">$${bill.amount.toFixed(2)}</span>
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  bill.action === 'created' 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }">
                  ${bill.action}
                </span>
              </div>
            </div>
          `).join('')}
        </div>

        ${summary.errors && summary.errors.length > 0 ? `
          <div class="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div class="font-semibold text-red-700 dark:text-red-400 mb-2">Errors</div>
            <ul class="text-sm text-red-600 dark:text-red-300 space-y-1">
              ${summary.errors.map(err => `<li>• ${err}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    contentDiv.innerHTML = html;
    resultsDiv.classList.remove('hidden');

    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
