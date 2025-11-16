# 🚀 Phase 6: Break Button System - Quick Start

**Time Required**: 10 minutes  
**Current Step**: Apply database migration

---

## ✅ Step 1: Apply Migration (5 minutes)

### Option A: Supabase Dashboard (Easiest) ⭐

1. Open: https://supabase.com/dashboard/project/dxbybjxpglpslmoenqyg/sql
2. Copy entire file: `react-portal/sql/migrations/015-create-time-events-and-breaks-COPY-TO-SUPABASE.sql`
3. Paste into SQL Editor
4. Click **"Run"** button
5. Wait for success message (takes ~10 seconds)

### Option B: Command Line

```powershell
# Set password and run SQL
$env:PGPASSWORD="Stv060485!!!"
psql -h db.dxbybjxpglpslmoenqyg.supabase.co -U postgres -d postgres -f "sql/migrations/015-create-time-events-and-breaks-COPY-TO-SUPABASE.sql"
```

---

## ✅ Step 2: Verify Migration (2 minutes)

Run test script:

```powershell
cd react-portal
node scripts/test/test-time-events.js
```

**Expected**: All 7 tests pass ✅

---

## ✅ Step 3: Update .env File (1 minute)

Add Supabase credentials to `react-portal/.env`:

```env
VITE_SUPABASE_URL=https://dxbybjxpglpslmoenqyg.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_SUPABASE=true
```

Get anon key from: https://supabase.com/dashboard/project/dxbybjxpglpslmoenqyg/settings/api

---

## ✅ Step 4: Test in Browser (2 minutes)

```powershell
# Start dev server
npm run dev
```

Add TimeTracker to a page to test:

```jsx
import TimeTracker from "../components/TimeTracker";

function Dashboard() {
  return (
    <div>
      <h1>Employee Dashboard</h1>
      <TimeTracker />
    </div>
  );
}
```

---

## 🎯 What Was Created

### Database Tables ✅

- **time_events**: 1 record per shift (not 4!)
- **break_periods**: Dedicated break tracking
- **Automatic triggers**: Calculate hours & breaks
- **RLS policies**: Security (workers see own data)
- **Views**: active_shifts, daily_time_summary

### React Components ✅

- **LiveClock**: Real-time clock with date/time
- **TimeTracker**: Clock in/out + break buttons
- **Auto-calculation**: Hours update live
- **GPS tracking**: Location on all events
- **Device detection**: Logs device info

### Benefits 🎉

- **75% fewer records**: 1 event vs 4 clock punches
- **Automatic hours**: No manual pairing needed
- **Clear breaks**: Dedicated button = no confusion
- **Multiple breaks**: Lunch + rest breaks supported
- **Real-time**: Hours update every minute
- **Industry standard**: Same pattern as ADP, Workday

---

## 📊 Quick Database Queries

### Check if tables exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('time_events', 'break_periods');
```

### View active shifts

```sql
SELECT * FROM active_shifts;
```

### View today's time events

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

---

## 🔧 Troubleshooting

### "Missing Supabase credentials"

→ Add to `.env`: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### "Cannot read workerId of undefined"

→ User not logged in, check AuthContext

### "hours_worked is null"

→ Clock out not set yet, or triggers not working

### Test triggers manually:

```sql
-- Insert test event
INSERT INTO time_events (worker_id, event_date, clock_in_time)
VALUES (
  (SELECT id FROM workers LIMIT 1),
  CURRENT_DATE,
  NOW()
) RETURNING *;

-- Update with clock out
UPDATE time_events
SET clock_out_time = NOW() + interval '8 hours'
WHERE id = 'your-id-here'
RETURNING hours_worked; -- Should be 8.0
```

---

## 📞 Next Steps After Migration

1. ✅ Migration applied
2. ✅ Tests pass
3. ⏳ Add to dashboard UI
4. ⏳ Test clock in/out flow
5. ⏳ Test break buttons
6. ⏳ Migrate existing ClockIn data (Phase 6.5)
7. ⏳ Update backend API (Phase 7)

---

## 🎓 How Break Button Works

### Old System (4 punches):

```
8:00 AM  → Clock IN
12:00 PM → Clock OUT (lunch? or end?)
1:00 PM  → Clock IN (return? or new job?)
5:00 PM  → Clock OUT (end of day)

Problem: Admin manually pairs punches
```

### New System (1 event + breaks):

```
8:00 AM  → Clock IN (time_event created)
12:00 PM → Start Break (break_period created)
1:00 PM  → End Break (break_minutes = 60)
5:00 PM  → Clock OUT (hours_worked = 8.0)

Automatic: hours = (5pm - 8am) - 60min = 8 hours ✅
```

---

## 📁 Files Created

- `sql/migrations/015-create-time-events-and-breaks.sql` - Full migration
- `sql/migrations/015-create-time-events-and-breaks-COPY-TO-SUPABASE.sql` - Copy/paste version
- `scripts/setup/apply-015-migration.cjs` - Migration script
- `scripts/test/test-time-events.js` - Test suite (7 tests)
- `src/components/LiveClock.jsx` - Real-time clock
- `src/components/LiveClock.css` - Clock styles
- `src/components/TimeTracker.jsx` - Break button UI (fixed import ✅)
- `src/components/TimeTracker.css` - Tracker styles
- `docs/PHASE_6_SETUP_GUIDE.md` - Complete guide
- `docs/PHASE_6_QUICK_START.md` - This file

---

**Ready?** → Copy SQL file to Supabase Dashboard → Click Run → Done! 🎉
