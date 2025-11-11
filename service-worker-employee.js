// 📦 Cache version matches deployment timestamp in HTML files (CACHE_VERSION)
// Update this when deploying to force cache refresh
const CACHE_NAME = "cls-employee-20251111-0100";
const ASSETS = [
  "./employeelogin.html",
  "./employeeDashboard.html",
  "./employeeSignup.html",
  "./css/style.css",
  "./css/variables.css",
  "./css/base.css", 
  "./css/components.css",
  "./css/layout.css",
  "./css/dashboard.css",
  "./css/forms.css",
  "./js/script.js",
  "./js/cache-buster.js",
  "./js/feather.min.js",
  "./js/admin/admin-tools.js",
  "./js/admin/clockin-manager.js",
  "./js/admin/time-edit-requests.js",
  "./js/admin/run-payroll.js",
  "./js/admin/quickbooks-sync.js",
  "./js/admin/view-as.js",
  "./components/navbar.html",
  "./components/footer.html",
  "./manifest-employee.json",
  "./assets/CLS-favicon.png",
  "./assets/CLS_Nav_Logo.png",
  "./assets/CLS-icon-192.png",
  "./assets/CLS-icon-512.png"
];

// ===============================
// CLS Offline Clock-In Sync System
// ===============================
const DB_NAME = 'CLSClockDB';
const STORE_NAME = 'clockQueue';
const API_URL = 'https://cls-proxy.s-garay.workers.dev';

// Open IndexedDB (or create if not exists)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('workerId', 'workerId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add a clock event to queue
async function queueClockIn(data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const record = {
      ...data,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    await store.add(record);
    return true;
  } catch (err) {
    console.error('❌ Failed to queue clock-in:', err);
    return false;
  }
}

// Send queued data when back online
async function syncClockData() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    const allData = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const pendingData = allData.filter(r => r.status === 'pending');

    if (pendingData.length === 0) {
      return;
    }

    for (const record of allData) {
      if (record.status === 'synced') continue;
      
      try {
        // Reconstruct the URL with parameters
        const url = `${API_URL}?action=clockin&workerId=${encodeURIComponent(record.workerId)}&lat=${record.lat}&lng=${record.lng}&lang=${record.lang || 'en'}&email=${encodeURIComponent(record.email || '')}`;
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          // Mark as synced
          const updateTx = db.transaction(STORE_NAME, 'readwrite');
          const updateStore = updateTx.objectStore(STORE_NAME);
          record.status = 'synced';
          record.syncedAt = new Date().toISOString();
          await updateStore.put(record);
          
          // Send notification to main thread
          if (self.clients) {
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'CLOCK_SYNC_SUCCESS',
                data: record
              });
            });
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.warn('Sync retry:', err.message);
        // Keep in queue for next sync attempt
      }
    }
    
    // Clean up old synced records (older than 7 days)
    await cleanupOldRecords();
    
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Clean up old synced records
async function cleanupOldRecords() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const range = IDBKeyRange.upperBound(weekAgo.toISOString());
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.status === 'synced') {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('⚠️ Cleanup failed:', err);
  }
}

// Get pending sync count
async function getPendingSyncCount() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    const allData = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return allData.filter(record => record.status === 'pending').length;
  } catch (err) {
    console.error('❌ Failed to get pending count:', err);
    return 0;
  }
}

// Install: cache assets
self.addEventListener("install", e => {
  console.log('[Service Worker] Installing with cache:', CACHE_NAME);
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching', ASSETS.length, 'assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  console.log('[Service Worker] Activating with cache:', CACHE_NAME);
  e.waitUntil(
    caches.keys().then(keys => {
      const oldCaches = keys.filter(k => k !== CACHE_NAME);
      if (oldCaches.length > 0) {
        console.log('[Service Worker] Deleting old caches:', oldCaches);
      }
      return Promise.all(oldCaches.map(k => caches.delete(k)));
    })
  );
});

// Fetch: serve cached or fetch new
self.addEventListener("fetch", e => {
  // Skip non-GET requests to avoid breaking JSONP
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(res => res || fetch(e.request))
  );
});

// Background sync for clock data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-clock-data') {
    event.waitUntil(syncClockData());
  }
});

// Manual sync when back online
self.addEventListener('online', () => {
  syncClockData();
});

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'QUEUE_CLOCK_IN':
      const queued = await queueClockIn(data);
      event.ports[0].postMessage({ success: queued });
      break;
      
    case 'TRIGGER_SYNC':
      await syncClockData();
      event.ports[0].postMessage({ success: true });
      break;
      
    case 'GET_PENDING_COUNT':
      const count = await getPendingSyncCount();
      event.ports[0].postMessage({ count });
      break;
  }
});

// Expose functions globally for debugging
self.queueClockIn = queueClockIn;
self.syncClockData = syncClockData;
self.getPendingSyncCount = getPendingSyncCount;
