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

      // Success
      await Dialog.alert(
        '✅ Payroll Complete',
        `Payroll processed successfully for week ${weekPeriod}.\n\nBills have been created/updated in QuickBooks Online for all active workers.`
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
