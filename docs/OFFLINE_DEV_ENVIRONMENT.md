# CLS Hub [Legacy] - Development Environment for Offline Features

## 🎯 Purpose

This development environment allows you to safely test and iterate on offline feature improvements while employees continue using the production system without interruption.

## 📁 Files Created

### Production Files (Unchanged - Employees Use These)
- `employeelogin.html` - Production login page
- `employeeDashboard.html` - Production dashboard
- `employeeSignup.html` - Production signup
- `service-worker-employee.js` - Production service worker
- `manifest-employee.json` - Production PWA manifest

### Development Files (New - For Testing)
- `employeelogin-dev.html` - **Dev login page** (orange banner)
- `employeeDashboard-dev.html` - **Dev dashboard** (with offline improvements)
- `employeeSignup-dev.html` - **Dev signup** 
- `service-worker-employee-dev.js` - **Dev service worker** (enhanced offline)
- `manifest-employee-dev.json` - **Dev PWA manifest**

---

## 🚀 Key Improvements in Dev Version

### 1. **Service Worker Registration on Dashboard** ✅ FIXED
**Problem:** Dashboard didn't register service worker  
**Solution:** Added full SW registration at bottom of dashboard HTML

### 2. **Device Tracking in Offline Clock-Ins** ✅ FIXED
**Problem:** Missing `device` field in offline save  
**Solution:** Always include device info from `getDeviceInfo()`

### 3. **Retry Limits** ✅ FIXED
**Problem:** Infinite retries on failed syncs  
**Solution:** 
- Max 5 retry attempts per record
- After 5 failures, mark as `failed` status
- Admin can clear failed records

### 4. **Enhanced IndexedDB Schema** ✅ NEW
**Added Fields:**
- `retryCount` - Track retry attempts
- `queuedAt` - When record was queued
- `syncedAt` - When record successfully synced
- `lastError` - Last error message
- `lastErrorAt` - When error occurred

### 5. **Offline Queue Viewer** ✅ NEW
**Features:**
- View all queued clock-ins before sync
- See pending/synced/failed status
- Clear failed records manually
- Real-time sync progress

### 6. **Better Error Logging** ✅ NEW
**Improvements:**
- Structured error messages
- Timestamp tracking
- Retry attempt logging
- Sync statistics

### 7. **Visual Dev Indicator** ✅ NEW
- Orange banner: "🚧 DEVELOPMENT VERSION"
- Orange theme color (#ff9800 vs #ffcc00)
- Console logs prefixed with `[DEV]`
- Link back to production version

---

## 🧪 How to Test

### Option 1: Direct URL Access
```
Production: https://carolinalumpers.com/employeelogin.html
Development: https://carolinalumpers.com/employeelogin-dev.html
```

### Option 2: Local Testing
```powershell
cd carolina-lumpers-web
python -m http.server 8010
# Open: http://localhost:8010/employeelogin-dev.html
```

### Option 3: Mobile Testing
1. Deploy both versions to GCP
2. Share dev URL with test users
3. Use Chrome DevTools → Application → Service Workers
4. Toggle offline mode to test

---

## 📊 Testing Checklist

### Basic Offline Flow
- [ ] Log in while online
- [ ] Turn off network (DevTools or airplane mode)
- [ ] Click "Clock In" button
- [ ] Verify "📱 Clock-in saved offline" message
- [ ] Check sync status shows pending count
- [ ] Turn network back on
- [ ] Verify automatic sync triggers
- [ ] Verify "✅ Clock-in synced" message

### Retry Limit Testing
- [ ] Queue multiple offline clock-ins
- [ ] Modify service worker to force failure (comment out fetch)
- [ ] Turn online, watch retries in console
- [ ] Verify stops after 5 attempts
- [ ] Verify status changes to `failed`
- [ ] Clear failed records

### Device Tracking
- [ ] Clock in offline
- [ ] Check IndexedDB record has `device` field
- [ ] Verify format: "iPhone - Safari" or "Android - Chrome"
- [ ] Sync record
- [ ] Check Activity_Logs sheet has device column populated

### Queue Viewer
- [ ] Open offline queue viewer (in dashboard)
- [ ] Verify all pending records shown
- [ ] Check retry count display
- [ ] View error messages for failed records
- [ ] Clear failed records
- [ ] Verify count updates

---

## 🔍 Debugging Tools

### Chrome DevTools Commands
```javascript
// Check IndexedDB
indexedDB.databases().then(console.log)

// View queued records
navigator.serviceWorker.controller.postMessage({
  type: 'GET_ALL_QUEUED'
})

// Manual sync trigger
navigator.serviceWorker.controller.postMessage({
  type: 'TRIGGER_SYNC'
})

// Get pending count
navigator.serviceWorker.controller.postMessage({
  type: 'GET_PENDING_COUNT'
})
```

### Service Worker Console Access
1. Chrome DevTools → Application → Service Workers
2. Click "Inspect" next to service worker
3. Run commands in SW console:
```javascript
// View all queued records
getAllQueuedRecords().then(console.table)

// Manual sync
syncClockData()

// Check pending count
getPendingSyncCount().then(console.log)
```

---

## 🐛 Known Issues (Dev Version)

### 1. Separate IndexedDB Database
**Impact:** Dev and production use different DB names  
**Why:** Prevents cross-contamination during testing  
**Note:** Dev uses `CLSClockDB_Dev`, production uses `CLSClockDB`

### 2. Different Service Worker Scope
**Impact:** Can't have both dev and prod installed as PWA simultaneously  
**Workaround:** Test in incognito or use different browser

### 3. Console Logging Verbose
**Impact:** Lots of `[DEV]` logs in console  
**Why:** Helpful for debugging, will clean up before promotion

---

## 🎓 How to Promote Dev → Production

When dev version is stable and tested:

1. **Backup Production Files**
```powershell
cp employeelogin.html employeelogin.backup.html
cp employeeDashboard.html employeeDashboard.backup.html
cp service-worker-employee.js service-worker-employee.backup.js
```

2. **Copy Dev → Production**
```powershell
# Copy dev files to production names
cp service-worker-employee-dev.js service-worker-employee.js

# Update HTML files manually (remove -dev suffix, change URLs)
# Update manifest references
```

3. **Update Service Worker Cache Version**
```javascript
// In service-worker-employee.js
const CACHE_NAME = "cls-employee-v7"; // Increment version
```

4. **Test Production**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Verify new SW activates
- Test offline features

5. **Monitor**
- Check Activity_Logs for device tracking
- Monitor for errors in Console
- Verify sync success rate

---

## 📈 Success Metrics

### Before (Current Production)
- ❌ Dashboard doesn't register SW
- ❌ Offline saves missing device info
- ❌ Infinite retry attempts
- ❌ No visibility into queue
- ❌ No error tracking

### After (Dev Version)
- ✅ Full SW registration on all pages
- ✅ Device info in 100% of offline saves
- ✅ Max 5 retries with failure handling
- ✅ Real-time queue viewer
- ✅ Structured error logging
- ✅ Sync progress indicators

---

## 🔗 Related Documentation

- **Offline Feature Review**: (The review document I created earlier)
- **Service Worker Docs**: `service-worker-employee-dev.js` (inline comments)
- **Database Schema**: `.github/DATABASE_SCHEMA.md`
- **Activity Logs**: `.github/copilot-instructions.md` (TT_LOGGER section)

---

## 💡 Tips for Testing

### Simulate Network Failures
```javascript
// In service worker, add artificial delay
await new Promise(resolve => setTimeout(resolve, 3000));
```

### Force Sync Failure
```javascript
// In syncClockData(), temporarily add:
throw new Error('Forced failure for testing');
```

### Check Queue Size
```javascript
// In console
navigator.serviceWorker.controller.postMessage({
  type: 'GET_PENDING_COUNT'
});

// Listen for response
navigator.serviceWorker.addEventListener('message', e => {
  console.log('Pending count:', e.data.count);
});
```

### Clear All Offline Data
```javascript
// Clear IndexedDB
indexedDB.deleteDatabase('CLSClockDB_Dev');

// Unregister service worker
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));

// Clear cache
caches.keys().then(keys => 
  Promise.all(keys.map(key => caches.delete(key)))
);
```

---

## 🎯 Next Steps

1. **Test dev version thoroughly** (use checklist above)
2. **Document any issues** found during testing
3. **Iterate on fixes** in dev environment
4. **Get user feedback** from test group
5. **Promote to production** when stable

---

## ⚠️ Important Notes

- **Do NOT edit production files** while testing dev version
- **Always test on multiple devices** (iOS, Android, desktop)
- **Check Activity_Logs sheet** after dev testing
- **Monitor for duplicate clock-ins** (sync + manual retry)
- **Clear dev database** before each major test

---

**Created**: October 21, 2025  
**Version**: Dev v1.0  
**Status**: Ready for Testing ✅
