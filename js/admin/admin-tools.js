/**
 * Admin Tools Coordinator Module
 * Initializes and manages all admin sub-modules
 */

import { ClockInManager } from './clockin-manager.js';
import { TimeEditRequests } from './time-edit-requests.js';
import { RunPayroll } from './run-payroll.js';
import { QuickBooksSync } from './quickbooks-sync.js';
import { InvoiceManagement } from './invoice-management.js';
import { ViewAs } from './view-as.js';

export class AdminTools {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.modules = {};
  }

  /**
   * Initialize all admin modules
   */
  async init() {
    // Check if user is admin/supervisor
    const isAdmin = await this.checkAdminRole();
    
    if (!isAdmin) {
      console.log('User is not admin/supervisor - hiding admin section');
      const adminSection = document.getElementById('admin-section');
      if (adminSection) {
        adminSection.style.display = 'none';
      }
      return;
    }

    // Initialize Clock-In Manager
    this.modules.clockInManager = new ClockInManager(this.apiUrl);
    this.modules.clockInManager.init();

    // Initialize Time Edit Requests
    this.modules.timeEditRequests = new TimeEditRequests(this.apiUrl);
    this.modules.timeEditRequests.init();

    // Initialize Run Payroll
    this.modules.runPayroll = new RunPayroll();
    this.modules.runPayroll.init();

    // Initialize QuickBooks Sync
    this.modules.quickBooksSync = new QuickBooksSync();
    this.modules.quickBooksSync.init();

    // Initialize Invoice Management
    this.modules.invoiceManagement = new InvoiceManagement(this.apiUrl);
    this.modules.invoiceManagement.init();

    // Initialize View As
    this.modules.viewAs = new ViewAs(this.apiUrl);
    this.modules.viewAs.init();

    // Expose modules to window for onclick handlers in rendered HTML
    window.clockInManager = this.modules.clockInManager;
    window.timeEditManager = this.modules.timeEditRequests;
    window.invoiceManager = this.modules.invoiceManagement;
    window.viewAsManager = this.modules.viewAs;

    // Listen for View As changes and reload dashboard data
    window.addEventListener('viewAsChanged', (event) => {
      this.handleViewAsChange(event.detail);
    });
  }

  /**
   * Check if current user has admin/supervisor role
   */
  async checkAdminRole() {
    try {
      const workerId = localStorage.getItem('CLS_WorkerID');
      if (!workerId) {
        return false;
      }

      const url = `${this.apiUrl}?action=whoami&workerId=${encodeURIComponent(workerId)}`;
      const response = await fetch(url);
      const data = await response.json();

      const role = data.role || '';
      const isAdmin = role === 'Admin' || role === 'Lead';
      return isAdmin;

    } catch (err) {
      console.error('Failed to check admin role:', err);
      return false;
    }
  }

  /**
   * Handle View As state changes
   * Reload dashboard data for the selected worker
   */
  handleViewAsChange(detail) {
    const { active, workerId } = detail;

    if (active && workerId) {
      // Reload dashboard data for selected worker
      // This would trigger re-fetching of reports, payroll, etc.
      // Implementation depends on parent dashboard structure
      
      // Dispatch event that parent dashboard can listen to
      const reloadEvent = new CustomEvent('reloadDashboard', {
        detail: { workerId }
      });
      window.dispatchEvent(reloadEvent);

    } else {
      // Reload dashboard data for original user
      const originalWorkerId = localStorage.getItem('CLS_WorkerID');
      const reloadEvent = new CustomEvent('reloadDashboard', {
        detail: { workerId: originalWorkerId }
      });
      window.dispatchEvent(reloadEvent);
    }
  }

  /**
   * Get reference to a specific module
   */
  getModule(moduleName) {
    return this.modules[moduleName];
  }

  /**
   * Get all modules
   */
  getAllModules() {
    return this.modules;
  }
}
