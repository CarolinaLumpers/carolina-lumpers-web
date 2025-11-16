# Phase 6: Break Button System - Setup Guide

**Status**: Ready to implement  
**Goal**: Replace 4-punch clock system with simplified break button tracking  
**Estimated Time**: 30 minutes

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Supabase project created
- ✅ `.env` file with credentials:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```
- ✅ Workers table populated (Phase 1 complete)

---

## 🚀 Implementation Steps

### Step 1: Apply Database Migration (5 minutes)

**Option A: Using Supabase SQL Editor (Recommended)**

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `sql/migrations/015-create-time-events-and-breaks.sql`
3. Paste into SQL Editor
4. Click "Run" button
5. Verify success message

**Option B: Using psql CLI**

```powershell
# From react-portal directory
$env:PGPASSWORD="your-db-password"
psql -h db.dxbybjxpglpslmoenqyg.supabase.co -U postgres -d postgres -f sql/migrations/015-create-time-events-and-breaks.sql
```

**Expected Result:**

```
✅ time_events table created
✅ break_periods table created
✅ 5 indexes created
✅ 3 trigger functions created
✅ RLS policies enabled
✅ 2 views created (active_shifts, daily_time_summary)
```

### Step 2: Verify Migration (2 minutes)

Run the test script:

```powershell
cd react-portal
node scripts/test/test-time-events.js
```

**Expected Output:**

```
🧪 Testing time_events and break_periods system

TEST 1: Clock In
✅ Clocked in successfully

TEST 2: Start Break (lunch)
✅ Break started

TEST 3: End Break (return from lunch)
✅ Break ended
   Break Duration: 60 minutes (should be 60)

TEST 4: Clock Out (end shift)
✅ Clocked out successfully
   Total Break Minutes: 60 (should be 60)
   Hours Worked: 8.0 (should be 8.0)

TEST 5: Verify Automatic Calculations
✅ Hour calculation correct!
   Expected: 8.0 hours
   Actual: 8.0 hours

TEST 6: Active Shifts View
✅ Active shifts view working (0 active shifts)

TEST 7: Testing Multiple Breaks
✅ Multiple breaks handled correctly
   Total Break Minutes: 75 (should be 75)
   Hours Worked: 7.75 (should be 7.75)

=============================================================
✨ ALL TESTS PASSED!
=============================================================
```

### Step 3: Update Environment Variables (2 minutes)

Ensure your `.env` file has all required variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://dxbybjxpglpslmoenqyg.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Feature Flags
VITE_USE_SUPABASE=true

# Database Connection (for scripts)
DATABASE_URL=postgresql://postgres:password@db.dxbybjxpglpslmoenqyg.supabase.co:5432/postgres
```

### Step 4: Update TimeTracker Component (Already Done ✅)

The TimeTracker component is already created with:

- Live clock display
- Break button controls
- GPS location tracking
- Automatic hour calculation
- Device detection

Just need to add the supabase import (see Step 5).

### Step 5: Fix Component Imports (2 minutes)

Update `TimeTracker.jsx` to import supabase correctly:

```jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase"; // ← ADD THIS LINE
import LiveClock from "./LiveClock";
import "./TimeTracker.css";
```

### Step 6: Integrate into Dashboard (10 minutes)

Add TimeTracker to the employee dashboard:

**File**: `src/pages/Dashboard.jsx` (or wherever employee dashboard is)

```jsx
import TimeTracker from "../components/TimeTracker";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Welcome, {user.displayName}</h1>

      {/* Add TimeTracker component */}
      <TimeTracker />

      {/* Rest of dashboard content */}
    </div>
  );
}
```

### Step 7: Test End-to-End Workflow (10 minutes)

1. **Start dev server**:

   ```powershell
   npm run dev
   ```

2. **Login as a worker**

3. **Test Clock In**:

   - Click "Clock In" button
   - Allow location access
   - Verify GPS coordinates captured
   - Check `time_events` table has new record

4. **Test Break**:

   - Click "Start Break"
   - Wait a moment
   - Click "End Break"
   - Verify `break_periods` table has record
   - Verify `total_break_minutes` updated on `time_events`

5. **Test Clock Out**:

   - Click "Clock Out"
   - Allow location access
   - Verify `hours_worked` calculated correctly
   - Formula: (clock_out - clock_in - breaks) / 60

6. **Test Real-time Updates**:
   - Open active_shifts view in Supabase
   - Clock in
   - Watch `hours_so_far` update in real-time

---

## 🔍 Troubleshooting

### Issue: "Missing Supabase credentials"

**Solution**: Add credentials to `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart dev server after adding.

### Issue: "Cannot read property 'workerId' of undefined"

**Solution**: User not logged in. Check AuthContext provides:

```javascript
const { user } = useAuth();
// user should have: { workerId, displayName, email, role }
```

### Issue: "Geolocation not supported"

**Solution**:

- Use HTTPS (not HTTP)
- Test on mobile device or enable location in browser settings
- Fallback: Allow manual lat/lng entry for testing

### Issue: "Row Level Security policy violation"

**Solution**: Check RLS policies allow worker to insert/update own records:

```sql
-- Workers can insert their own time events
CREATE POLICY "time_events_insert_own" ON time_events
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE id = worker_id
    )
  );
```

### Issue: "hours_worked not calculating"

**Solution**: Check triggers are enabled:

```sql
-- Verify trigger exists
SELECT tgname FROM pg_trigger WHERE tgrelid = 'time_events'::regclass;
-- Should see: trg_recalculate_hours_on_clock_out

-- Test manually
UPDATE time_events
SET clock_out_time = NOW()
WHERE id = 'your-time-event-id';

-- Check hours_worked column populated
```

---

## 📊 Database Queries for Verification

### Check active shifts

```sql
SELECT * FROM active_shifts;
```

### Check today's time events

```sql
SELECT
  te.*,
  w.display_name,
  COUNT(bp.id) as break_count
FROM time_events te
JOIN workers w ON w.id = te.worker_id
LEFT JOIN break_periods bp ON bp.time_event_id = te.id
WHERE te.event_date = CURRENT_DATE
GROUP BY te.id, w.display_name;
```

### Check daily summary

```sql
SELECT * FROM daily_time_summary
WHERE event_date = CURRENT_DATE
ORDER BY display_name;
```

### Check break periods

```sql
SELECT
  bp.*,
  te.clock_in_time,
  te.clock_out_time,
  w.display_name
FROM break_periods bp
JOIN time_events te ON te.id = bp.time_event_id
JOIN workers w ON w.id = te.worker_id
WHERE te.event_date = CURRENT_DATE;
```

---

## ✅ Success Criteria

Before considering Phase 6 complete, verify:

- [ ] Migration 015 applied without errors
- [ ] Test script passes all 7 tests
- [ ] time_events table exists with correct schema
- [ ] break_periods table exists with correct schema
- [ ] Triggers calculate break_minutes automatically
- [ ] Triggers calculate hours_worked automatically
- [ ] RLS policies work (workers see own data only)
- [ ] TimeTracker component renders without errors
- [ ] Clock In button creates time_event with GPS
- [ ] Start Break creates break_period record
- [ ] End Break updates break_period with end time
- [ ] Clock Out updates time_event with clock_out_time
- [ ] Hours display updates in real-time
- [ ] Multiple breaks per shift work correctly
- [ ] Admin can view all time_events
- [ ] Workers can only view their own time_events

---

## 📈 Next Steps After Phase 6

1. **Migrate Existing ClockIn Data** (Phase 6.5)

   - Create script to convert 411 ClockIn records → time_events
   - Group 4 punches per day into 1 event + breaks
   - Preserve all location and device data

2. **Update Backend API** (Phase 7)

   - Add time_event CRUD endpoints to Google Apps Script
   - Add break_period endpoints
   - Update geofencing validation
   - Update admin approval workflow

3. **Admin Dashboard Integration** (Phase 8)

   - Add time_events approval UI
   - Show active shifts in real-time
   - Add break period editing for admins
   - Generate reports from time_events

4. **Mobile App Updates** (Phase 9)
   - Update PWA with offline break tracking
   - Add push notifications for break reminders
   - Implement background location tracking

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites met
3. Check Supabase logs for errors
4. Review browser console for JavaScript errors
5. Check database logs in Supabase Dashboard → Logs

**Common Commands:**

```powershell
# Check Supabase connection
node scripts/test/test-connection-simple.js

# Verify workers table
node scripts/test/test-supabase-workers.js

# Test time events
node scripts/test/test-time-events.js

# Start dev server
npm run dev
```
