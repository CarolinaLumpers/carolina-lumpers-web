/**
 * Admin Dashboard Coordinator Module
 * Manages sidebar navigation and initializes all admin sub-modules
 */

import { ClockInManager } from './admin/clockin-manager.js';
import { TimeEditRequests } from './admin/time-edit-requests.js';
import { RunPayroll } from './admin/run-payroll.js';
import { QuickBooksSync } from './admin/quickbooks-sync.js';
import { InvoiceManagement } from './admin/invoice-management.js';
import { W9Management } from './admin/w9-management.js';
import { ViewAs } from './admin/view-as.js';

export class AdminDashboard {
  constructor() {
    this.apiUrl = 'https://cls-proxy.s-garay.workers.dev';
    this.modules = {};
    this.currentSection = 'overview';
  }

  /**
   * Initialize the admin dashboard
   */
  async init() {
    // Check authentication
    if (!this.checkAuth()) {
      window.location.href = 'employeelogin.html';
      return;
    }

    // Setup UI
    this.setupNavigation();
    this.setupUserInfo();
    this.setupLogout();
    
    // Initialize admin modules
    await this.initModules();
    
    // Load overview stats
    await this.loadOverviewStats();

    console.log('✅ Admin Dashboard initialized');
  }

  /**
   * Check if user is authenticated and is admin
   */
  checkAuth() {
    const workerId = localStorage.getItem('CLS_WorkerID');
    const role = localStorage.getItem('CLS_Role');

    if (!workerId) {
      console.warn('No user session found');
      return false;
    }

    if (role !== 'Admin') {
      console.warn('User is not admin - redirecting to employee dashboard');
      alert('Access denied. This admin panel is for administrators only.\n\nSupervisors and workers should use the employee dashboard.');
      window.location.href = 'employeeDashboard.html';
      return false;
    }

    return true;
  }

  /**
   * Setup sidebar navigation
   */
  setupNavigation() {
    // Desktop navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.navigateToSection(section);
      });
    });

    // Bottom navigation (mobile)
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const section = item.dataset.section;
        this.navigateToSection(section);
      });
    });

    // Quick action buttons
    const quickActionBtns = document.querySelectorAll('[data-navigate]');
    quickActionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.navigate;
        this.navigateToSection(section);
      });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }

  /**
   * Navigate to a specific section
   */
  navigateToSection(section) {
    // Update active nav link (desktop)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.section === section) {
        link.classList.add('active');
      }
    });

    // Update active bottom nav item (mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === section) {
        item.classList.add('active');
      }
    });

    // Show/hide sections
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === section) {
        sec.classList.add('active');
      }
    });

    // Close mobile sidebar
    if (window.innerWidth <= 1024) {
      document.getElementById('sidebar').classList.remove('open');
    }

    this.currentSection = section;

    // Update URL hash
    window.location.hash = section;
  }

  /**
   * Setup user info display
   */
  setupUserInfo() {
    const workerName = localStorage.getItem('CLS_WorkerName') || 'Admin User';
    const role = localStorage.getItem('CLS_Role') || 'Administrator';

    // Get initials
    const nameParts = workerName.split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : nameParts[0].substring(0, 2).toUpperCase();

    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent = workerName;
    document.getElementById('userRole').textContent = role;
  }

  /**
   * Setup logout functionality
   */
  setupLogout() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          localStorage.removeItem('CLS_WorkerID');
          localStorage.removeItem('CLS_WorkerName');
          localStorage.removeItem('CLS_Email');
          localStorage.removeItem('CLS_Role');
          window.location.href = 'employeelogin.html';
        }
      });
    }
  }

  /**
   * Initialize all admin modules
   */
  async initModules() {
    try {
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
      this.modules.invoiceManagement = new InvoiceManagement();
      this.modules.invoiceManagement.init();
      // Expose to window for onclick handlers
      window.invoiceManager = this.modules.invoiceManagement;

      // Initialize W9 Management
      this.modules.w9Management = new W9Management(this.apiUrl);
      this.modules.w9Management.init();
      // Expose to window for onclick handlers
      window.w9Manager = this.modules.w9Management;

      // Initialize View As
      this.modules.viewAs = new ViewAs(this.apiUrl);
      await this.modules.viewAs.init().catch(err => {
        console.warn('View As module failed to initialize:', err);
      });


    } catch (error) {
      console.error('Error initializing modules:', error);
    }
  }

  /**
   * Load overview statistics
   */
  async loadOverviewStats() {
    try {
      const workerId = localStorage.getItem('CLS_WorkerID');

      // Load pending time edits
      const editRequests = await this.fetchTimeEditRequests();
      const pendingEdits = editRequests.filter(req => req.status === 'pending').length;
      document.getElementById('statPendingEdits').textContent = pendingEdits;

      // Load active workers count
      const workers = await this.fetchAllWorkers();
      document.getElementById('statActiveWorkers').textContent = workers.length;

      // Calculate this week's hours
      const weekHours = await this.calculateWeekHours();
      document.getElementById('statWeekHours').textContent = weekHours.toFixed(1);

    } catch (error) {
      console.error('Error loading overview stats:', error);
      document.getElementById('statPendingEdits').textContent = '0';
      document.getElementById('statActiveWorkers').textContent = '0';
      document.getElementById('statWeekHours').textContent = '0';
    }
  }

  /**
   * Fetch time edit requests
   */
  async fetchTimeEditRequests() {
    try {
      const workerId = localStorage.getItem('CLS_WorkerID');
      const url = `${this.apiUrl}?action=getTimeEditRequests&requesterId=${encodeURIComponent(workerId)}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.error('Error fetching time edit requests:', error);
      return [];
    }
  }

  /**
   * Fetch unique workers who clocked in today via direct Sheets API
   * Reads from ClockIn sheet
   */
  async fetchAllWorkers() {
    try {
      const sheetsProxyUrl = 'https://sheets-direct-proxy.steve-3d1.workers.dev';
      const spreadsheetId = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
      const range = 'ClockIn!A:C'; // ClockinID, WorkerID, Date
      
      const url = `${sheetsProxyUrl}/api/sheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Sheets API error: ${response.status}`);
      }
      
      const result = await response.json();
      const rows = result.data?.values || [];
      
      if (rows.length === 0) return [];
      
      // Get today's date in M/D/YYYY format (EST timezone)
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
      const today = formatter.format(now);
      
      // Parse headers (first row)
      const headers = rows[0];
      const workerIdIdx = headers.indexOf('WorkerID');
      const dateIdx = headers.indexOf('Date');
      
      if (workerIdIdx === -1 || dateIdx === -1) {
        console.error('Required columns not found in ClockIn sheet');
        return [];
      }
      
      // Extract unique worker IDs for today
      const uniqueWorkers = new Set();
      
      rows.slice(1).forEach(row => {
        const workerId = row[workerIdIdx];
        const dateStr = row[dateIdx];
        
        if (workerId && dateStr === today) {
          uniqueWorkers.add(workerId);
        }
      });
      
      return Array.from(uniqueWorkers);
    } catch (error) {
      console.error('Error fetching workers:', error);
      return [];
    }
  }

  /**
   * Calculate this week's total hours via direct Sheets API
   * Reads from Payroll LineItems sheet, column I (Qty)
   */
  async calculateWeekHours() {
    try {
      const sheetsProxyUrl = 'https://sheets-direct-proxy.steve-3d1.workers.dev';
      const spreadsheetId = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
      const range = 'Payroll LineItems!A:I'; // Through Qty column
      
      const url = `${sheetsProxyUrl}/api/sheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Sheets API error: ${response.status}`);
      }
      
      const result = await response.json();
      const rows = result.data?.values || [];
      
      if (rows.length === 0) return 0;
      
      // Get current week's Sunday-Saturday range
      const now = new Date();
      const dayOfWeek = now.getDay();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - dayOfWeek);
      sunday.setHours(0, 0, 0, 0);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);
      
      // Parse headers (first row)
      const headers = rows[0];
      const dateIdx = headers.indexOf('Date');
      const qtyIdx = headers.indexOf('Qty'); // Column I
      
      if (dateIdx === -1 || qtyIdx === -1) {
        console.error('Required columns not found in Payroll LineItems');
        return 0;
      }
      
      // Sum Qty for this week's date range
      let totalHours = 0;
      
      rows.slice(1).forEach(row => {
        const dateStr = row[dateIdx];
        const qtyStr = row[qtyIdx];
        
        if (!dateStr || !qtyStr) return;
        
        // Parse date (handles M/D/YYYY format from Sheets)
        const recordDate = new Date(dateStr);
        
        if (!isNaN(recordDate.getTime()) && recordDate >= sunday && recordDate <= saturday) {
          const hours = parseFloat(qtyStr) || 0;
          totalHours += hours;
        }
      });
      
      return totalHours;
    } catch (error) {
      console.error('Error calculating week hours:', error);
      return 0;
    }
  }
}
