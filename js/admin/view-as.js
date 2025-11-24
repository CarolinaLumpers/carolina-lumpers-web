/**
 * View As Module
 * Allows admins to view dashboard as another worker
 */

import { Dialog } from '../utils/dialog.js';

export class ViewAs {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.isActive = false;
    this.selectedWorkerId = null;
  }

  /**
   * Initialize the View As module
   */
  async init() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    const btnViewAs = document.getElementById('btnViewAsWorker');
    const btnReset = document.getElementById('btnResetView');

    if (dropdown) {
      await this.populateWorkerDropdown();
    }

    if (btnViewAs) {
      btnViewAs.addEventListener('click', () => this.activateViewAs());
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetView());
    }
  }

  /**
   * Activate View As mode
   */
  activateViewAs() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    if (!dropdown || !dropdown.value) {
      alert('Please select a worker first');
      return;
    }

    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const workerId = dropdown.value;
    const workerName = selectedOption.text.split(' (')[0];

    // Store current admin info
    if (!localStorage.getItem('CLS_AdminID')) {
      localStorage.setItem('CLS_AdminID', localStorage.getItem('CLS_WorkerID'));
      localStorage.setItem('CLS_AdminName', localStorage.getItem('CLS_WorkerName'));
      localStorage.setItem('CLS_AdminRole', localStorage.getItem('CLS_Role'));
    }

    // Switch to worker view
    localStorage.setItem('CLS_WorkerID', workerId);
    localStorage.setItem('CLS_WorkerName', workerName);
    localStorage.setItem('CLS_Role', 'Worker');
    localStorage.setItem('CLS_ViewAsActive', 'true');

    console.log(`👤 Viewing as: ${workerName} (${workerId})`);
    
    // Redirect to employee dashboard
    window.location.href = 'employeeDashboard.html?view=employee';
  }

  /**
   * Reset to admin view
   */
  resetView() {
    const adminId = localStorage.getItem('CLS_AdminID');
    const adminName = localStorage.getItem('CLS_AdminName');
    const adminRole = localStorage.getItem('CLS_AdminRole');

    if (adminId) {
      localStorage.setItem('CLS_WorkerID', adminId);
      localStorage.setItem('CLS_WorkerName', adminName);
      localStorage.setItem('CLS_Role', adminRole);
      localStorage.removeItem('CLS_AdminID');
      localStorage.removeItem('CLS_AdminName');
      localStorage.removeItem('CLS_AdminRole');
      localStorage.removeItem('CLS_ViewAsActive');
      
      console.log('🔄 Reset to admin view');
      window.location.reload();
    }
  }

  /**
   * Populate worker dropdown for View As feature
   */
  async populateWorkerDropdown() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    if (!dropdown) return;

    try {
      // Get current admin's worker ID
      const adminWorkerId = localStorage.getItem('CLS_WorkerID');
      const url = `${this.apiUrl}?action=reportAll&workerId=${encodeURIComponent(adminWorkerId)}`;
      const response = await fetch(url);
      const data = await response.json();

      // Extract unique workers from the report data
      let workers = [];
      if (data.workers && Array.isArray(data.workers)) {
        workers = data.workers;
      } else if (data.report && Array.isArray(data.report)) {
        // Extract unique workers from report records
        const workerMap = new Map();
        data.report.forEach(record => {
          if (record.WorkerID && !workerMap.has(record.WorkerID)) {
            workerMap.set(record.WorkerID, {
              workerId: record.WorkerID,
              displayName: record.DisplayName || record.WorkerID
            });
          }
        });
        workers = Array.from(workerMap.values());
      }

      if (workers.length === 0) {
        dropdown.innerHTML = '<option value="">-- No workers found --</option>';
        return;
      }

      // Sort workers by name
      workers.sort((a, b) => {
        const nameA = (a.displayName || a.name || a.workerId).toLowerCase();
        const nameB = (b.displayName || b.name || b.workerId).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      dropdown.innerHTML = '<option value="">-- Select a Worker --</option>' +
        workers.map(w => `<option value="${w.workerId}">${this.escapeHtml(w.displayName || w.name || w.workerId)} (${w.workerId})</option>`).join('');



    } catch (err) {
      console.error('Failed to populate View As dropdown:', err);
      dropdown.innerHTML = '<option value="">-- Error loading workers --</option>';
    }
  }

  /**
   * Toggle View As mode
   */
  async toggle() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    const btnToggle = document.getElementById('btnToggleViewAs');
    const indicator = document.getElementById('viewAsIndicator');

    if (!this.isActive) {
      // Activate View As mode
      const selectedWorkerId = dropdown?.value;
      if (!selectedWorkerId) {
        await Dialog.alert('Worker Required', 'Please select a worker first');
        return;
      }
      
      this.isActive = true;
      this.selectedWorkerId = selectedWorkerId;

      // Update UI
      if (btnToggle) {
        btnToggle.textContent = 'Disable View As';
        btnToggle.classList.add('btn-danger');
        btnToggle.classList.remove('btn-primary');
      }

      if (indicator) {
        const selectedText = dropdown.options[dropdown.selectedIndex]?.text || selectedWorkerId;
        indicator.textContent = `👁️ Viewing as: ${selectedText}`;
        indicator.style.display = 'block';
      }

      if (dropdown) {
        dropdown.disabled = true;
      }

      // Notify parent dashboard to reload data as selected worker
      this.notifyViewAsChange(selectedWorkerId);

    } else {
      // Deactivate View As mode
      this.isActive = false;
      this.selectedWorkerId = null;

      // Update UI
      if (btnToggle) {
        btnToggle.textContent = 'Enable View As';
        btnToggle.classList.add('btn-primary');
        btnToggle.classList.remove('btn-danger');
      }

      if (indicator) {
        indicator.style.display = 'none';
      }

      if (dropdown) {
        dropdown.disabled = false;
        dropdown.value = '';
      }

      // Notify parent dashboard to reload data as original user
      this.notifyViewAsChange(null);
    }
  }

  /**
   * Notify parent dashboard about View As state change
   * This allows the main dashboard to reload data for the selected worker
   */
  notifyViewAsChange(workerId) {
    // Dispatch custom event that parent dashboard can listen to
    const event = new CustomEvent('viewAsChanged', {
      detail: {
        active: this.isActive,
        workerId: workerId
      }
    });
    window.dispatchEvent(event);

    console.log('View As changed:', this.isActive ? `Viewing as ${workerId}` : 'Disabled');
  }

  /**
   * Get current View As state
   */
  getState() {
    return {
      active: this.isActive,
      workerId: this.selectedWorkerId
    };
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
