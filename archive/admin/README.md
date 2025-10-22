# DEPRECATED - Old Admin Dashboard

**Status:** OBSOLETE - DO NOT USE

## Why Archived?

This was an early prototype admin dashboard that was never fully developed. All admin functionality has been moved to the main `employeeDashboard.html` with a comprehensive Admin Tools section.

## Current Admin Implementation

See `employeeDashboard.html` which includes:
- Clock-In Manager
- Time Edit Requests
- Run Payroll
- QuickBooks Sync
- View As feature

The admin functionality has been refactored into modular ES6 modules in `js/admin/`:
- `admin-tools.js` (coordinator)
- `clockin-manager.js`
- `time-edit-requests.js`
- `run-payroll.js`
- `quickbooks-sync.js`
- `view-as.js`

## What This Folder Contains

- `adminDashboard.html` - Incomplete skeleton with basic nav
- `admin.js` - Basic placeholder code with no real functionality
- `style.css` - Basic styling
- `manifest.json` - PWA manifest (unused)
- `service-worker.js` - Service worker (unused)

**Archived:** October 22, 2025
**Reason:** Replaced by modular admin tools in employeeDashboard.html
