/**
 * Run Payroll Module
 * Handles weekly payroll processing and week period selection
 */

import { Dialog } from '../utils/dialog.js';

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

    // Populate week selector
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
    
    // Generate only 2 Saturdays: This week and last week
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
    
    // Build dropdown with only 2 options
    dropdown.innerHTML = '<option value="">-- Select Week --</option>' + 
      weeks.map((sat, index) => {
        const tag = index === 0 ? ' (This Week)' : ' (Last Week)';
        return `<option value="${sat}">${sat}${tag}</option>`;
      }).join('');
    
    // Auto-select last week (index 1) as that's the typical payroll run
    dropdown.value = weeks[1];
  }

  /**
   * Trigger payroll processing
   */
  async trigger() {
    const dropdown = document.getElementById('runPayrollWeekSelect');
    const button = document.getElementById('btnRunPayroll');
    const resultsDiv = document.getElementById('payrollResults');
    const statusDiv = document.getElementById('payrollStatus');
    const messageDiv = document.getElementById('payrollMessage');
    
    const weekPeriod = dropdown.value;
    
    if (!weekPeriod) {
      await Dialog.alert('Week Period Required', 'Please select a week period first');
      return;
    }

    // Confirm before running
    const confirmed = await Dialog.confirm(
      '⚠️ WARNING: Process Payroll',
      `This will process payroll and create bills in QuickBooks Online.\n\nWeek Period: ${weekPeriod}\n\nThis action cannot be undone. Continue?`,
      { confirmText: 'Generate Payroll', cancelText: 'Cancel', variant: 'destructive' }
    );
    if (!confirmed) return;

    // Show loading state
    button.disabled = true;
    button.innerHTML = '<span>Processing...</span>';
    resultsDiv.style.display = 'block';
    statusDiv.innerHTML = '⏳ Processing payroll...';
    statusDiv.style.color = '#FFC107';
    messageDiv.innerHTML = 'Please wait. This may take a minute.';

    try {
      const payload = {
        "Webhook Type": "Run Payroll",
        "Week Period": weekPeriod
      };

      console.log('📤 Sending payroll request:', payload);

      const response = await fetch(this.payrollApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('📥 Payroll response:', data);

      if (!data || (data.status && data.status !== 200)) {
        throw new Error(data?.message || 'Payroll processing failed');
      }

      // Success
      statusDiv.innerHTML = '✅ Payroll Complete';
      statusDiv.style.color = '#4CAF50';
      messageDiv.innerHTML = `Payroll processed successfully for week ${weekPeriod}. Bills have been created/updated in QuickBooks Online.`;

    } catch (err) {
      console.error('Payroll error:', err);
      statusDiv.innerHTML = '❌ Payroll Failed';
      statusDiv.style.color = '#f44336';
      messageDiv.innerHTML = `Error: ${err.message || err}<br><br>Check that PayrollProject script is deployed and accessible.`;
    } finally {
      button.disabled = false;
      button.innerHTML = '<span data-en="Run Payroll" data-es="Ejecutar Nómina" data-pt="Executar Folha de Pagamento">Run Payroll</span>';
    }
  }
}
