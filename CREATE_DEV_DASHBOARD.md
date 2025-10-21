# Creating employeeDashboard-dev.html

## Quick Instructions

Since the dashboard file is very large (1779 lines), here's how to create it:

### Option 1: Copy & Modify (Recommended)
```powershell
# In carolina-lumpers-web directory
cp employeeDashboard.html employeeDashboard-dev.html
```

Then make these changes in `employeeDashboard-dev.html`:

### 1. Update Title (Line 15)
```html
<!-- BEFORE -->
<title data-en="Employee Dashboard | Carolina Lumper Service"

<!-- AFTER -->
<title data-en="Employee Dashboard (DEV) | Carolina Lumper Service"
```

### 2. Change Manifest (Line 21)
```html
<!-- BEFORE -->
<link rel="manifest" href="manifest-employee.json">

<!-- AFTER -->
<link rel="manifest" href="manifest-employee-dev.json">
```

### 3. Change Theme Color (Line 22)
```html
<!-- BEFORE -->
<meta name="theme-color" content="#ffcc00">

<!-- AFTER -->
<meta name="theme-color" content="#ff9800">
```

### 4. Add DEV Banner (After line 186, before dashboard div)
```html
<!-- Add this style in <head> after line 181 -->
<style>
  .dev-banner {
    position: fixed;
    top: 60px; /* Below navbar */
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ff9800, #f57c00);
    color: #000;
    padding: 8px;
    text-align: center;
    font-weight: bold;
    font-size: 14px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
</style>

<!-- Add banner HTML after navbar (line 186) -->
<body data-page="employeeDashboard-dev" class="dashboard-page">
  <!-- Navigation Bar -->
  <div id="navbar-container"></div>
  
  <!-- DEV Environment Banner -->
  <div class="dev-banner">
    🚧 DEVELOPMENT VERSION - Testing Offline Features 🚧
    <a href="employeeDashboard.html" style="margin-left:20px;color:#000;text-decoration:underline;">
      Back to Production
    </a>
  </div>

  <!-- DASHBOARD -->
  <div class="dashboard" style="margin-top: 40px;">
```

### 5. Update Service Worker Registration (Around line 1770)
```javascript
// FIND (around line 1770):
  <script>
    // Service Worker Registration for Dashboard
    if ('serviceWorker' in navigator) {
  </script>

// REPLACE WITH:
  <script>
    // Service Worker Registration for Dashboard (DEV VERSION)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker-employee-dev.js', { scope: './' })
        .then(registration => {
          console.log('✅ [DEV] SW ready on dashboard:', registration.scope);
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 [DEV] New SW version available');
                // Show update prompt
                if (confirm('New version available! Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(err => console.error('❌ [DEV] SW registration failed:', err));
    }
  </script>
```

### 6. Fix Device Info in Offline Save (Line 1033)
```javascript
// FIND (around line 1033):
              const clockData = {
                workerId: workerId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                lang: localStorage.getItem("CLS_Lang") || "en",
                email: email || '',
                timestamp: new Date().toISOString()
              };

// REPLACE WITH:
              const deviceInfo = window.getDeviceInfo ? window.getDeviceInfo() : 
                                 { displayString: 'Unknown Device' };
              const clockData = {
                workerId: workerId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                lang: localStorage.getItem("CLS_Lang") || "en",
                email: email || '',
                device: deviceInfo.displayString,  // ✅ ADDED
                timestamp: new Date().toISOString()
              };
```

### 7. Add Offline Queue Viewer (Add before closing </div> of dashboard, around line 390)
```html
    <!-- OFFLINE QUEUE VIEWER (DEV ONLY) -->
    <div class="card" style="margin-top: 20px; background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800;">
      <h3 class="section-title" style="color: #ff9800;">
        🔧 DEV: Offline Queue Viewer
      </h3>
      
      <div style="margin: 20px 0;">
        <button id="btnViewQueue" class="btn btn-primary" style="background: #ff9800; border-color: #ff9800;">
          View Queued Clock-Ins
        </button>
        <button id="btnClearFailed" class="btn btn-danger" style="margin-left: 10px;">
          Clear Failed Records
        </button>
        <button id="btnManualSync" class="btn btn-success" style="margin-left: 10px;">
          Force Sync Now
        </button>
      </div>
      
      <div id="queueViewerContainer" style="margin-top: 20px;">
        <!-- Queue will be displayed here -->
      </div>
    </div>
```

### 8. Add Queue Viewer JavaScript (Add before closing </script>, around line 1765)
```javascript
    // =================== OFFLINE QUEUE VIEWER (DEV ONLY) ===================
    document.getElementById('btnViewQueue')?.addEventListener('click', async () => {
      const container = document.getElementById('queueViewerContainer');
      container.innerHTML = '<p>Loading queue...</p>';
      
      try {
        const result = await sendMessageToServiceWorker('GET_ALL_QUEUED');
        const records = result.records || [];
        
        if (records.length === 0) {
          container.innerHTML = '<p class="muted">No queued records</p>';
          return;
        }
        
        let html = `
          <table style="width:100%; margin-top:10px;">
            <thead>
              <tr style="background:rgba(255,152,0,0.2);">
                <th>ID</th>
                <th>Worker</th>
                <th>Status</th>
                <th>Retries</th>
                <th>Queued At</th>
                <th>Last Error</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        records.forEach(r => {
          const statusClass = r.status === 'synced' ? 'status-confirmed' : 
                             r.status === 'failed' ? 'status-denied' : 'status-pending';
          html += `
            <tr>
              <td>${r.id}</td>
              <td>${r.workerId}</td>
              <td><span class="status-badge ${statusClass}">${r.status}</span></td>
              <td>${r.retryCount || 0}/5</td>
              <td>${new Date(r.queuedAt).toLocaleString()}</td>
              <td style="font-size:11px;color:#aaa;">${r.lastError || '-'}</td>
            </tr>
          `;
        });
        
        html += '</tbody></table>';
        html += `<p style="margin-top:10px;color:#aaa;font-size:12px;">
          Total: ${records.length} | 
          Pending: ${records.filter(r => r.status === 'pending').length} |
          Synced: ${records.filter(r => r.status === 'synced').length} |
          Failed: ${records.filter(r => r.status === 'failed').length}
        </p>`;
        
        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = `<p style="color:#f44336;">Error: ${err.message}</p>`;
      }
    });
    
    document.getElementById('btnClearFailed')?.addEventListener('click', async () => {
      if (!confirm('Clear all failed records? This cannot be undone.')) return;
      
      try {
        const result = await sendMessageToServiceWorker('CLEAR_FAILED');
        if (result.success) {
          alert(`Cleared ${result.clearedCount} failed records`);
          document.getElementById('btnViewQueue').click(); // Refresh view
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
    
    document.getElementById('btnManualSync')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnManualSync');
      btn.disabled = true;
      btn.textContent = 'Syncing...';
      
      try {
        await triggerSync();
        setTimeout(() => {
          btn.textContent = 'Force Sync Now';
          btn.disabled = false;
          document.getElementById('btnViewQueue').click(); // Refresh view
        }, 2000);
      } catch (err) {
        alert('Sync error: ' + err.message);
        btn.textContent = 'Force Sync Now';
        btn.disabled = false;
      }
    });
```

### 9. Update Cache Version (Line 30)
```html
<!-- BEFORE -->
<link rel="stylesheet" href="css/style.css?v=2024-pwa-integration">

<!-- AFTER -->
<link rel="stylesheet" href="css/style.css?v=2025-dev-offline">
```

---

## Option 2: Automated Script

Create a PowerShell script to do all replacements:

```powershell
# create-dev-dashboard.ps1
$source = "employeeDashboard.html"
$dest = "employeeDashboard-dev.html"

# Copy file
Copy-Item $source $dest

# Make replacements
(Get-Content $dest) | 
  ForEach-Object {
    $_ -replace 'Employee Dashboard \|', 'Employee Dashboard (DEV) |' `
       -replace 'manifest-employee.json', 'manifest-employee-dev.json' `
       -replace 'theme-color" content="#ffcc00"', 'theme-color" content="#ff9800"' `
       -replace 'data-page="employeeDashboard"', 'data-page="employeeDashboard-dev"' `
       -replace 'v=2024-pwa-integration', 'v=2025-dev-offline'
  } | 
  Set-Content $dest

Write-Host "✅ Created $dest - Now manually add DEV banner and queue viewer"
```

---

## Testing the Complete Dev Environment

1. **Deploy all files to test server**
2. **Access**: `https://your-domain.com/employeelogin-dev.html`
3. **Look for**:
   - Orange dev banner at top
   - Orange theme color
   - `[DEV]` logs in console
   - Offline queue viewer in dashboard
4. **Test offline flow**:
   - Clock in while offline
   - Check queue viewer
   - Go online
   - Watch sync happen
   - Verify device field populated

---

**Created**: October 21, 2025  
**For**: CLS Hub [Legacy] Offline Features
