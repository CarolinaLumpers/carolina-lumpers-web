/**
 * View As Module
 * Allows admins to view the dashboard as another worker
 */

export class ViewAs {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.isActive = false;
    this.selectedWorkerId = null;
  }

  /**
   * Initialize the View As module
   */
  init() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    const btnToggle = document.getElementById('btnToggleViewAs');

    if (dropdown) {
      this.populateWorkerDropdown();
    }

    if (btnToggle) {
      btnToggle.addEventListener('click', () => this.toggle());
    }
  }

  /**
   * Populate worker dropdown for View As feature
   */
  async populateWorkerDropdown() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    if (!dropdown) return;

    try {
      const url = `${this.apiUrl}?action=listWorkers`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.ok || !data.workers) {
        throw new Error('Failed to load workers list');
      }

      const workers = data.workers || [];
      dropdown.innerHTML = '<option value="">-- Select Worker --</option>' +
        workers.map(w => `<option value="${w.workerId}">${this.escapeHtml(w.displayName)} (${w.workerId})</option>`).join('');

    } catch (err) {
      console.error('Failed to populate View As dropdown:', err);
      dropdown.innerHTML = '<option value="">Error loading workers</option>';
    }
  }

  /**
   * Toggle View As mode
   */
  toggle() {
    const dropdown = document.getElementById('viewAsWorkerSelect');
    const btnToggle = document.getElementById('btnToggleViewAs');
    const indicator = document.getElementById('viewAsIndicator');

    if (!this.isActive) {
      // Activate View As mode
      const selectedWorkerId = dropdown?.value;
      if (!selectedWorkerId) {
        alert('Please select a worker first');
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
