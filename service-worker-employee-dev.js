const CACHE_NAME = "cls-employee-dev-v6";
const ASSETS = [
  "./employeelogin-dev.html",
  "./employeeDashboard-dev.html",
  "./employeeSignup-dev.html",
  "./css/style.css",
  "./css/variables.css",
  "./css/base.css", 
  "./css/components.css",
  "./css/layout.css",
  "./css/dashboard.css",
  "./css/forms.css",
  "./js/script.js",
  "./components/navbar.html",
  "./components/footer.html",
  "./manifest-employee-dev.json",
  "./assets/CLS-favicon.png",
  "./assets/CLS_Nav_Logo.png",
  "./assets/CLS-icon-192.png",
  "./assets/CLS-icon-512.png"
];

// ===============================
// CLS Offline Clock-In Sync System (DEV VERSION)
// Improvements: Retry limits, better error handling, device tracking
// ===============================
const DB_NAME = 'CLSClockDB_Dev';
const STORE_NAME = 'clockQueue';
const API_URL = 'https://cls-proxy.s-garay.workers.dev';
const MAX_RETRIES = 5;
const CLEANUP_DAYS = 7;

// Open IndexedDB (or create if not exists)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Increment version for new fields
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Delete old store if upgrading from v1
      if (event.oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('workerId', 'workerId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add a clock event to queue with improved validation
async function queueClockIn(data) {
  try {
    // Validate required fields
    if (!data.workerId || !data.lat || !data.lng) {
      console.error('❌ Invalid clock-in data:', data);
      return false;
    }
    
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const record = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      queuedAt: new Date().toISOString()
    };
    
    await store.add(record);
    console.log('✅ Clock-in queued offline (DEV):', record);
    
    return true;
  } catch (err) {
    console.error('❌ Failed to queue clock-in:', err);
    return false;
  }
}

// Send queued data when back online with retry limits
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

    console.log(`🔄 [DEV] Syncing ${allData.length} queued clock-ins...`);

    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const record of allData) {
      if (record.status === 'synced') {
        skippedCount++;
        continue;
      }
      
      // Check retry limit
      if (record.retryCount >= MAX_RETRIES) {
        console.warn(`⚠️ Record ${record.id} exceeded max retries, marking as failed`);
        await updateRecordStatus(db, record.id, 'failed', record.retryCount, 
          'Max retry attempts exceeded');
        failedCount++;
        continue;
      }
      
      try {
        // Reconstruct the URL with all parameters including device
        const deviceParam = record.device ? `&device=${encodeURIComponent(record.device)}` : '';
        const url = `${API_URL}?action=clockin&workerId=${encodeURIComponent(record.workerId)}&lat=${record.lat}&lng=${record.lng}&lang=${record.lang || 'en'}&email=${encodeURIComponent(record.email || '')}${deviceParam}`;
        
        console.log(`🔄 Syncing record ${record.id} (attempt ${record.retryCount + 1}/${MAX_RETRIES})`);
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          // Mark as synced
          await updateRecordStatus(db, record.id, 'synced', record.retryCount);
          syncedCount++;
          
          console.log(`✅ Synced record ${record.id}:`, record);
          
          // Send notification to main thread
          if (self.clients) {
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'CLOCK_SYNC_SUCCESS',
                data: { ...record, syncedAt: new Date().toISOString() }
              });
            });
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.warn(`🔁 Failed to sync record ${record.id}, will retry:`, err.message);
        
        // Increment retry count
        await updateRecordStatus(db, record.id, 'pending', record.retryCount + 1, err.message);
        failedCount++;
      }
    }
    
    console.log(`📊 Sync complete: ${syncedCount} synced, ${failedCount} failed, ${skippedCount} already synced`);
    
    // Clean up old synced records
    await cleanupOldRecords();
    
    // Notify main thread of completion
    if (self.clients) {
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          data: { syncedCount, failedCount, skippedCount }
        });
      });
    }
    
  } catch (err) {
    console.error('❌ Sync failed:', err);
  }
}

// Helper to update record status
async function updateRecordStatus(db, id, status, retryCount, errorMessage = null) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const record = await store.get(id);
  
  if (record) {
    record.status = status;
    record.retryCount = retryCount;
    if (status === 'synced') {
      record.syncedAt = new Date().toISOString();
    }
    if (errorMessage) {
      record.lastError = errorMessage;
      record.lastErrorAt = new Date().toISOString();
    }
    await store.put(record);
  }
}

// Clean up old synced records
async function cleanupOldRecords() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
    
    const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
    const request = index.openCursor(range);
    
    let cleanedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.status === 'synced') {
          cursor.delete();
          cleanedCount++;
        }
        cursor.continue();
      } else {
        if (cleanedCount > 0) {
          console.log(`🧹 Cleaned up ${cleanedCount} old synced records`);
        }
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
    const index = store.index('status');
    const request = index.count('pending');
    
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('❌ Failed to get pending count:', err);
    return 0;
  }
}

// Get all queued records for display
async function getAllQueuedRecords() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('❌ Failed to get queued records:', err);
    return [];
  }
}

// Install: cache assets
self.addEventListener("install", e => {
  console.log('🔧 [DEV] Service Worker installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 [DEV] Caching assets...');
      return cache.addAll(ASSETS);
    })
  );
  // Force activation immediately
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  console.log('✅ [DEV] Service Worker activating...');
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k.startsWith('cls-employee-') && k !== CACHE_NAME)
           .map(k => {
             console.log(`🗑️ Deleting old cache: ${k}`);
             return caches.delete(k);
           })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch: serve cached or fetch new
self.addEventListener("fetch", e => {
  // Skip non-GET requests to avoid breaking JSONP
  if (e.request.method !== 'GET') return;
  
  // Skip API requests (let them go through normally)
  if (e.request.url.includes('cls-proxy.s-garay.workers.dev')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(res => {
      if (res) {
        console.log(`📦 [DEV] Serving from cache: ${e.request.url}`);
        return res;
      }
      console.log(`🌐 [DEV] Fetching from network: ${e.request.url}`);
      return fetch(e.request);
    })
  );
});

// Background sync for clock data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-clock-data') {
    console.log('🔄 [DEV] Background sync triggered');
    event.waitUntil(syncClockData());
  }
});

// Manual sync when back online
self.addEventListener('online', () => {
  console.log('🌐 [DEV] Device back online - triggering sync');
  syncClockData();
});

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  console.log(`📨 [DEV] Received message: ${type}`, data);
  
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
      
    case 'GET_ALL_QUEUED':
      const records = await getAllQueuedRecords();
      event.ports[0].postMessage({ records });
      break;
      
    case 'CLEAR_FAILED':
      // Clear all failed records
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const allRecords = await store.getAll();
        
        let clearedCount = 0;
        for (const record of allRecords) {
          if (record.status === 'failed') {
            await store.delete(record.id);
            clearedCount++;
          }
        }
        
        event.ports[0].postMessage({ success: true, clearedCount });
      } catch (err) {
        event.ports[0].postMessage({ success: false, error: err.message });
      }
      break;
  }
});

// Expose functions globally for debugging
self.queueClockIn = queueClockIn;
self.syncClockData = syncClockData;
self.getPendingSyncCount = getPendingSyncCount;
self.getAllQueuedRecords = getAllQueuedRecords;

console.log('🚀 [DEV] Service Worker loaded successfully');
