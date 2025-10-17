# Carolina Lumpers: Migration to Modern Stack

**Last Updated**: October 17, 2025  
**Status**: Planning Phase  
**Goal**: Replace Google Sheets + Apps Script + AppSheet with Supabase + React PWA

---

## 🎯 Why Migrate?

### Current Pain Points
- ❌ **Hourly bot delays** - Up to 60 min to process clock-ins
- ❌ **AppSheet limitations** - Can't trigger Apps Script functions
- ❌ **Dual clock-in systems** - GPS and NFC don't communicate
- ❌ **22 Google Sheets** - Hard to maintain, no real relationships
- ❌ **Manual QuickBooks sync** - Error-prone, time-consuming
- ❌ **Split codebases** - 8+ separate Apps Script projects
- ❌ **No offline-first** - Service worker hacky, not robust

### What You'll Gain
- ✅ **Real database** - PostgreSQL with foreign keys, constraints, indexes
- ✅ **Instant processing** - Real-time triggers, no polling
- ✅ **Unified codebase** - Single React app, one source of truth
- ✅ **Modern PWA** - True offline-first with sync queue
- ✅ **Type safety** - TypeScript end-to-end
- ✅ **Better DX** - Hot reload, component library, testing
- ✅ **Automated QB sync** - API integration, no manual exports
- ✅ **Proper auth** - Role-based access control (RBAC)

---

## 🏗️ Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODERN CLS STACK                             │
└─────────────────────────────────────────────────────────────────┘

Frontend (React PWA)
├─ Vite + React 18 + TypeScript
├─ TanStack Router (type-safe routing)
├─ TanStack Query (data fetching + offline cache)
├─ Tailwind CSS + shadcn/ui (components)
├─ Zustand (lightweight state)
└─ Deployed to Vercel (Edge Network)
    ↓
Supabase (Backend-as-a-Service)
├─ PostgreSQL Database (with RLS policies)
├─ Supabase Auth (JWT tokens, MFA, magic links)
├─ Row Level Security (company_id + role isolation)
├─ Edge Functions (Deno runtime)
│   ├─ QuickBooks sync
│   ├─ Payroll generation
│   ├─ Email notifications
│   └─ Webhook handlers
├─ Realtime (WebSocket subscriptions)
├─ Storage (file uploads: S3-compatible)
└─ PostgREST (auto-generated REST API)
    ↓
Integrations
├─ QuickBooks Online API (OAuth 2.0)
├─ Twilio (SMS notifications)
├─ SendGrid (emails)
└─ Sentry (error tracking)
```

---

## 📊 Database Schema Design

### Core Principles
1. **One company_id per row** - Multi-tenant ready
2. **Foreign keys everywhere** - Data integrity enforced at DB level
3. **Audit columns** - created_at, updated_at, created_by on every table
4. **Soft deletes** - deleted_at instead of hard deletes
5. **Proper enums** - PostgreSQL ENUMs for status fields
6. **Indexes** - Performance from day one

### Tables (Simplified from 22 sheets → 15 tables)

```sql
-- Core Entities
├─ companies (multi-tenant support)
├─ users (Supabase Auth integration)
├─ workers (employees, extends users)
├─ clients (customers)
├─ sites (client locations with geofence)

-- Work Management
├─ projects (high-level work)
├─ jobs (project breakdown)
├─ tasks (individual assignments)
├─ shifts (work sessions with clock-in/out)
├─ shift_edits (time edit requests with approval workflow)

-- Financial
├─ invoices (client billing)
├─ invoice_line_items (detailed charges)
├─ payroll_periods (weekly batches)
├─ payroll_line_items (worker payments)

-- System
├─ audit_logs (centralized activity tracking)
├─ integrations (QB sync status, API keys)
└─ applicants (hiring pipeline)
```

### Key Relationships
```sql
-- workers.user_id → users.id (1:1, Supabase Auth)
-- shifts.worker_id → workers.id
-- shifts.site_id → sites.id (geofence validation)
-- shifts.task_id → tasks.id (optional, link work to task)
-- tasks.job_id → jobs.id
-- jobs.project_id → projects.id
-- projects.client_id → clients.id

-- invoice_line_items.job_id → jobs.id
-- payroll_line_items.worker_id → workers.id
-- payroll_line_items.shift_id → shifts.id
```

---

## 🔐 Security Model

### Row Level Security (RLS)
```sql
-- Example: Workers can only see their own shifts
CREATE POLICY "workers_view_own_shifts"
ON shifts FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM workers WHERE id = worker_id)
);

-- Example: Admins can see all shifts in their company
CREATE POLICY "admins_view_company_shifts"
ON shifts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND company_id = shifts.company_id
    AND role = 'admin'
  )
);
```

### Role Hierarchy
```
admin       → Full access (all tables, all operations)
supervisor  → Manage workers, approve time edits, view reports
worker      → Clock in/out, view own shifts, submit time edit requests
client      → View projects/invoices, read-only
applicant   → Submit application, read-only status
```

---

## 🚀 Migration Strategy

### Phase 0: Foundation (Week 1)
**Goal**: Set up development environment

- [x] Document current system (DONE - you have excellent docs now!)
- [ ] Create new GitHub repo: `cls-system`
- [ ] Set up Supabase projects: `cls-dev`, `cls-prod`
- [ ] Configure Vercel deployments
- [ ] Install Supabase CLI + VS Code extensions
- [ ] Create initial database schema SQL

**Deliverable**: Empty repo with infrastructure ready

---

### Phase 1: Database Migration (Week 2)
**Goal**: Port Google Sheets data to PostgreSQL

#### 1.1 Schema Creation
```sql
-- supabase/migrations/20251020_initial_schema.sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'worker', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  company_id UUID REFERENCES companies(id),
  worker_id TEXT UNIQUE NOT NULL, -- CLS001, CLS002, etc.
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone TEXT,
  hourly_rate DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX idx_workers_company ON workers(company_id);
CREATE INDEX idx_workers_user ON workers(user_id);
CREATE INDEX idx_workers_status ON workers(status) WHERE status = 'active';
```

#### 1.2 Data Export from Google Sheets
```javascript
// scripts/export-sheets-to-csv.js
// Run in Apps Script or Node with Sheets API
function exportAllSheets() {
  const sheets = [
    'Workers', 'Clients', 'Sites', 'Tasks', 
    'ClockIn', 'Invoice LineItems', 'Payroll LineItems'
  ];
  
  sheets.forEach(sheetName => {
    const csv = exportSheetToCSV(sheetName);
    DriveApp.createFile(`${sheetName}.csv`, csv);
  });
}
```

#### 1.3 Data Transformation & Import
```python
# scripts/transform-and-load.py
import pandas as pd
from supabase import create_client

# Transform Workers sheet
workers_df = pd.read_csv('Workers.csv')
workers_df = workers_df.rename(columns={
  'WorkerID': 'worker_id',
  'First Name': 'first_name',
  'Last Name': 'last_name',
  # ... map all columns
})

# Clean data
workers_df['phone'] = workers_df['phone'].str.replace(r'\D', '', regex=True)
workers_df['hourly_rate'] = pd.to_numeric(workers_df['hourly_rate'], errors='coerce')

# Load to Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
for _, row in workers_df.iterrows():
  supabase.table('workers').insert(row.to_dict()).execute()
```

**Deliverable**: All historical data in Supabase

---

### Phase 2: Auth & Core App Shell (Week 3)
**Goal**: Login, routing, dashboard framework

#### 2.1 Project Setup
```bash
npm create vite@latest cls-pwa -- --template react-ts
cd cls-pwa
npm install @supabase/supabase-js @tanstack/react-query @tanstack/react-router
npm install tailwindcss postcss autoprefixer
npm install zustand date-fns zod
npx shadcn-ui@latest init
```

#### 2.2 Supabase Client
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types' // Auto-generated

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

#### 2.3 Auth Flow
```typescript
// src/features/auth/LoginPage.tsx
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  
  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) toast.error(error.message)
    else toast.success('Check your email for login link')
    setLoading(false)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carolina Lumpers</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          type="email" 
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
        <Button onClick={handleLogin} disabled={loading}>
          {loading ? 'Sending...' : 'Send Magic Link'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### 2.4 Role-Based Routing
```typescript
// src/router.tsx
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  }
})

const workerRoutes = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/worker',
  component: WorkerLayout,
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'worker') throw redirect({ to: '/dashboard' })
  }
})
```

**Deliverable**: Working login + role-aware dashboard shell

---

### Phase 3: Clock-In System (Week 4-5)
**Goal**: Unified GPS + NFC clock-in with offline support

#### 3.1 Unified Clock-In Component
```typescript
// src/features/shifts/ClockInButton.tsx
export function ClockInButton() {
  const { worker } = useAuth()
  const { mutate: clockIn, isPending } = useClockIn()
  
  async function handleClockIn() {
    // Get location
    const position = await getCurrentPosition()
    
    // Get nearest site (geofence)
    const site = await findNearestSite(position.coords)
    
    // Validate geofence
    const distance = calculateDistance(position.coords, site)
    if (distance > site.geofence_radius_miles) {
      toast.error(`Too far from site (${distance.toFixed(2)} mi away)`)
      return
    }
    
    // Create shift
    clockIn({
      worker_id: worker.id,
      site_id: site.id,
      clock_in_time: new Date().toISOString(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      distance_miles: distance,
      device: getDeviceInfo(),
    })
  }
  
  return (
    <Button onClick={handleClockIn} disabled={isPending} size="lg">
      {isPending ? 'Clocking In...' : 'Start Work'}
    </Button>
  )
}
```

#### 3.2 Offline Queue
```typescript
// src/lib/offline-queue.ts
import { openDB } from 'idb'

const db = await openDB('cls-offline', 1, {
  upgrade(db) {
    db.createObjectStore('pending-shifts', { keyPath: 'id', autoIncrement: true })
  }
})

export async function queueShift(shiftData: Shift) {
  await db.add('pending-shifts', { ...shiftData, queued_at: Date.now() })
}

export async function syncPendingShifts() {
  const pending = await db.getAll('pending-shifts')
  
  for (const shift of pending) {
    try {
      await supabase.from('shifts').insert(shift)
      await db.delete('pending-shifts', shift.id)
    } catch (error) {
      console.error('Sync failed for shift', shift.id, error)
    }
  }
}

// Auto-sync when online
window.addEventListener('online', syncPendingShifts)
```

#### 3.3 Backend: Geofence Validation
```sql
-- supabase/functions/validate-clockin/index.ts
CREATE OR REPLACE FUNCTION validate_shift_geofence()
RETURNS TRIGGER AS $$
BEGIN
  -- Get site geofence
  SELECT geofence_radius_miles INTO v_radius
  FROM sites WHERE id = NEW.site_id;
  
  -- Calculate distance (haversine formula)
  v_distance := calculate_distance(
    NEW.latitude, NEW.longitude,
    site.latitude, site.longitude
  );
  
  -- Reject if too far
  IF v_distance > v_radius THEN
    RAISE EXCEPTION 'Clock-in rejected: % miles from site', v_distance;
  END IF;
  
  -- Log to audit_logs
  INSERT INTO audit_logs (event_type, worker_id, details)
  VALUES ('CLOCK_IN', NEW.worker_id, jsonb_build_object(
    'site_id', NEW.site_id,
    'distance_miles', v_distance,
    'device', NEW.device
  ));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shifts_validate_geofence
  BEFORE INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION validate_shift_geofence();
```

**Deliverable**: Full-featured clock-in with offline support

---

### Phase 4: Time Edit Workflow (Week 6)
**Goal**: Replace TimeEditRequests sheet with proper approval flow

#### 4.1 Database Schema
```sql
CREATE TABLE shift_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  requested_by UUID REFERENCES users(id),
  
  -- Original values
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  
  -- Requested changes
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  
  -- Approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Workers can create/view their own requests
CREATE POLICY "workers_manage_own_edits" ON shift_edits
FOR ALL USING (
  auth.uid() = (SELECT user_id FROM workers WHERE id = worker_id)
);

-- RLS: Supervisors/Admins can approve/deny
CREATE POLICY "supervisors_review_edits" ON shift_edits
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('supervisor', 'admin')
  )
);
```

#### 4.2 Submit Edit Request
```typescript
// src/features/shifts/SubmitEditRequest.tsx
export function SubmitEditRequest({ shift }: { shift: Shift }) {
  const form = useForm<EditRequest>({
    defaultValues: {
      shift_id: shift.id,
      original_clock_in: shift.clock_in_time,
      original_clock_out: shift.clock_out_time,
    }
  })
  
  const { mutate: submitEdit } = useMutation({
    mutationFn: (data: EditRequest) => 
      supabase.from('shift_edits').insert(data),
    onSuccess: () => {
      toast.success('Edit request submitted')
      // Notify supervisor via email
      supabase.functions.invoke('send-edit-notification', {
        body: { edit_id: data.id }
      })
    }
  })
  
  return (
    <Form {...form}>
      <DateTimePicker name="requested_clock_in" label="Clock In Time" />
      <DateTimePicker name="requested_clock_out" label="Clock Out Time" />
      <Textarea name="reason" label="Reason for change" required />
      <Button type="submit">Submit Request</Button>
    </Form>
  )
}
```

#### 4.3 Approval Interface
```typescript
// src/features/shifts/ApproveEditRequests.tsx
export function ApproveEditRequests() {
  const { data: pendingEdits } = useQuery({
    queryKey: ['shift-edits', 'pending'],
    queryFn: () => supabase
      .from('shift_edits')
      .select('*, shifts(*), workers(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
  })
  
  async function handleApprove(editId: string) {
    // Update shift_edit status
    await supabase
      .from('shift_edits')
      .update({ 
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', editId)
    
    // Update the actual shift
    const edit = pendingEdits.find(e => e.id === editId)
    await supabase
      .from('shifts')
      .update({
        clock_in_time: edit.requested_clock_in,
        clock_out_time: edit.requested_clock_out,
        edit_approved_at: new Date().toISOString(),
        edit_approved_by: user.id
      })
      .eq('id', edit.shift_id)
    
    toast.success('Edit approved')
  }
  
  return (
    <Table>
      {pendingEdits.map(edit => (
        <TableRow key={edit.id}>
          <TableCell>{edit.workers.display_name}</TableCell>
          <TableCell>{formatDate(edit.requested_clock_in)}</TableCell>
          <TableCell>{edit.reason}</TableCell>
          <TableCell>
            <Button onClick={() => handleApprove(edit.id)}>Approve</Button>
            <Button variant="destructive" onClick={() => handleDeny(edit.id)}>Deny</Button>
          </TableCell>
        </TableRow>
      ))}
    </Table>
  )
}
```

**Deliverable**: Full time edit workflow with email notifications

---

### Phase 5: Projects, Jobs, Tasks (Week 7-8)
**Goal**: Work assignment and tracking

#### 5.1 Task Assignment
```typescript
// src/features/tasks/AssignTask.tsx
export function AssignTask({ job }: { job: Job }) {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  
  async function handleAssign() {
    const tasks = selectedWorkers.map(workerId => ({
      job_id: job.id,
      worker_id: workerId,
      status: 'assigned',
      assigned_at: new Date().toISOString()
    }))
    
    await supabase.from('tasks').insert(tasks)
    
    // Send SMS notifications
    await supabase.functions.invoke('notify-workers', {
      body: { task_ids: tasks.map(t => t.id) }
    })
  }
  
  return (
    <MultiSelect
      options={availableWorkers}
      value={selectedWorkers}
      onChange={setSelectedWorkers}
    />
  )
}
```

#### 5.2 Link Shifts to Tasks
```sql
-- When worker clocks in, optionally link to a task
ALTER TABLE shifts ADD COLUMN task_id UUID REFERENCES tasks(id);

-- Auto-link if worker has active task at that site today
CREATE OR REPLACE FUNCTION auto_link_shift_to_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Find active task for this worker at this site today
  SELECT id INTO NEW.task_id
  FROM tasks
  WHERE worker_id = NEW.worker_id
    AND job_id IN (
      SELECT id FROM jobs WHERE site_id = NEW.site_id
    )
    AND DATE(assigned_at) = DATE(NEW.clock_in_time)
    AND status = 'in_progress'
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shifts_auto_link_task
  BEFORE INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_shift_to_task();
```

**Deliverable**: Task management with auto-linking to shifts

---

### Phase 6: QuickBooks Integration (Week 9-10)
**Goal**: Automated invoice and payroll sync

#### 6.1 Edge Function: QB Sync
```typescript
// supabase/functions/quickbooks-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Get pending invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*), clients(*)')
    .eq('qb_synced', false)
  
  for (const invoice of invoices) {
    try {
      // Create invoice in QuickBooks
      const qbInvoice = await createQBInvoice({
        CustomerRef: { value: invoice.clients.qb_customer_id },
        Line: invoice.invoice_line_items.map(item => ({
          Amount: item.amount,
          Description: item.description,
          SalesItemLineDetail: {
            ItemRef: { value: item.qb_item_id }
          }
        })),
        TotalAmt: invoice.total_amount
      })
      
      // Update invoice with QB ID
      await supabase
        .from('invoices')
        .update({
          qb_invoice_id: qbInvoice.Id,
          qb_synced: true,
          qb_synced_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
      
      console.log(`Synced invoice ${invoice.id} → QB ${qbInvoice.Id}`)
      
    } catch (error) {
      console.error(`Failed to sync invoice ${invoice.id}:`, error)
      
      // Log error
      await supabase.from('integration_logs').insert({
        integration: 'quickbooks',
        event_type: 'invoice_sync_failed',
        invoice_id: invoice.id,
        error_message: error.message
      })
    }
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### 6.2 Cron Job: Scheduled Sync
```sql
-- supabase/functions/quickbooks-sync/cron.sql
SELECT cron.schedule(
  'quickbooks-sync',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/quickbooks-sync',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
  $$
);
```

**Deliverable**: Automated QB sync with error handling

---

### Phase 7: Parallel Testing (Week 11-12)
**Goal**: Run both systems simultaneously

#### 7.1 Dual-Write Sync Script
```typescript
// scripts/sync-to-old-system.ts
// Supabase Database Webhook → Apps Script endpoint

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Listen for new shifts
supabase
  .channel('shifts-sync')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'shifts' },
    async (payload) => {
      const shift = payload.new
      
      // Write to Google Sheets via Apps Script
      await fetch(APPS_SCRIPT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          action: 'syncShift',
          data: {
            ClockinID: shift.id,
            WorkerID: shift.worker.worker_id, // CLS001
            Date: shift.clock_in_time.split('T')[0],
            Time: shift.clock_in_time.split('T')[1],
            Latitude: shift.latitude,
            Longitude: shift.longitude,
            // ... map all fields
          }
        })
      })
      
      console.log(`Synced shift ${shift.id} to Google Sheets`)
    }
  )
  .subscribe()
```

#### 7.2 Data Validation
```python
# scripts/validate-consistency.py
# Run daily to compare Supabase vs Google Sheets

import pandas as pd
from supabase import create_client

supabase = create_client(SUPABASE_URL, SERVICE_KEY)

# Get shifts from Supabase
sb_shifts = supabase.table('shifts').select('*').execute().data
sb_df = pd.DataFrame(sb_shifts)

# Get ClockIn from Google Sheets
sheets_df = pd.read_csv('ClockIn_export.csv')

# Compare counts
print(f"Supabase: {len(sb_df)} shifts")
print(f"Sheets: {len(sheets_df)} entries")

# Compare specific records
merged = sb_df.merge(sheets_df, left_on='id', right_on='ClockinID', how='outer', indicator=True)
mismatches = merged[merged['_merge'] != 'both']

if len(mismatches) > 0:
  print(f"⚠️  {len(mismatches)} records don't match!")
  mismatches.to_csv('data_discrepancies.csv')
else:
  print("✅ All data matches!")
```

**Deliverable**: Validated data consistency between systems

---

### Phase 8: User Migration (Week 13)
**Goal**: Switch users from old to new system

#### 8.1 Migration Schedule
```
Monday Week 13: Admins + IT
  - Full access to troubleshoot
  - Can fall back to old system if needed
  
Tuesday Week 13: Supervisors
  - Time edit approvals
  - Task assignments
  - Reports

Wednesday-Friday Week 13: Workers (phased)
  - Wed: 10 pilot workers
  - Thu: 50% of workers
  - Fri: All workers
  
Monday Week 14: Clients
  - Portal access
  - Invoice viewing
```

#### 8.2 Training Materials
```markdown
# Worker Quick Start Guide

1. **Login**: Check your email for magic link
2. **Clock In**: 
   - Tap "Start Work" button
   - Allow location access
   - Confirm you're at correct site
3. **Clock Out**: Tap "End Work" when done
4. **View History**: See all your shifts in "My Time"
5. **Request Edit**: Tap shift → "Request Change"

📱 **Offline Mode**: App works without internet!
   - Clock-ins saved locally
   - Auto-syncs when online
```

**Deliverable**: All users migrated with training

---

### Phase 9: Cutover (Week 14)
**Goal**: New system is source of truth

#### 9.1 Final Checklist
- [ ] All data validated (no discrepancies)
- [ ] All users trained
- [ ] QuickBooks sync tested with real data
- [ ] Payroll generated and compared to old system
- [ ] Invoices generated and compared
- [ ] Mobile PWA installed on all worker phones
- [ ] Admin dashboards showing correct data
- [ ] Error tracking active (Sentry)
- [ ] Backup procedures documented

#### 9.2 Go-Live Steps
```
1. Friday 5pm: Freeze old system (read-only)
2. Friday 6pm: Final data sync
3. Friday 7pm: Disable dual-write script
4. Friday 8pm: Announce new system live
5. Saturday-Sunday: Monitor for issues
6. Monday: Normal operations on new system
7. Week 15: Keep old system as read-only backup
8. Week 16: Archive old system
```

**Deliverable**: Production system live

---

## 📈 Success Metrics

### Performance
- Clock-in latency: < 2 seconds
- Dashboard load time: < 1 second
- Offline sync: < 30 seconds after reconnect
- QB sync: < 5 minutes

### Data Quality
- 0 duplicate shifts
- 100% geofence validation
- 100% audit log coverage
- 0 orphaned records

### User Adoption
- 100% workers using PWA by Week 14
- 0 fallback to old system by Week 15
- < 5 support tickets per week by Week 16

---

## 🚨 Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**: 
- Daily backups of both systems
- Dual-write period (Weeks 11-12)
- Automated validation scripts
- Rollback plan (can revert to old system within 1 hour)

### Risk 2: User Resistance
**Mitigation**:
- Phased rollout (admins first, workers last)
- Comprehensive training materials
- Support channel (Slack/Discord)
- Keep old system available for 2 weeks

### Risk 3: QuickBooks Sync Failure
**Mitigation**:
- Manual fallback export (CSV)
- Detailed error logging
- Test with sandbox QB account first
- Phone support from QB API team

### Risk 4: Offline Sync Issues
**Mitigation**:
- Extensive testing on poor network
- Manual sync button (user-initiated)
- Queue status visible to user
- Admin can manually enter shifts if needed

---

## 💰 Cost Estimate

### One-Time Costs
| Item | Cost |
|------|------|
| Supabase Pro (setup) | $25/month × 3 months = $75 |
| Vercel Pro (setup) | $20/month × 3 months = $60 |
| Domain + SSL | $15 |
| QuickBooks API (sandbox) | Free |
| **Total One-Time** | **$150** |

### Ongoing Monthly Costs
| Item | Cost |
|------|------|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| QuickBooks API | $0 (included in QB subscription) |
| Twilio SMS | ~$10 |
| SendGrid Email | Free (up to 100/day) |
| Sentry Error Tracking | Free (up to 5k events/month) |
| **Total Monthly** | **~$55** |

**vs Current Costs**:
- Google Workspace: Already paying
- AppSheet: $10/user/month (if paid) = $370/month for 37 workers
- **Savings: ~$315/month** 🎉

---

## 📚 Documentation Deliverables

1. **Architecture Diagram** (draw.io)
2. **Database ERD** (dbdiagram.io)
3. **API Documentation** (auto-generated from TypeScript)
4. **User Manuals** (per role: worker, supervisor, admin, client)
5. **Admin Runbook** (troubleshooting, backups, monitoring)
6. **Developer Guide** (local setup, testing, deployment)
7. **Migration Runbook** (step-by-step cutover procedures)

---

## 🎓 Next Steps

### Immediate (This Week)
1. **Create new GitHub repo**: `cls-system`
2. **Set up Supabase projects**: dev + prod
3. **Initialize database schema**: start with core tables
4. **Export current data**: all Google Sheets → CSV

### Week 1
5. **Generate TypeScript types**: from Supabase schema
6. **Build auth flow**: magic link login
7. **Create dashboard shell**: role-based routing
8. **Test RLS policies**: ensure data isolation

### Week 2-3
9. **Build clock-in feature**: GPS + geofence
10. **Implement offline queue**: IndexedDB + sync
11. **Create shift history**: view past work
12. **Add time edit flow**: request + approval

### Week 4-5
13. **Build task assignment**: supervisor → worker
14. **Link shifts to tasks**: auto-linking logic
15. **Create reports**: hours worked, by site, by worker

### Week 6+
16. **QB integration**: invoice + payroll sync
17. **Client portal**: view projects and invoices
18. **Hiring module**: application form
19. **Parallel testing**: run both systems
20. **User migration**: phased rollout
21. **Cutover**: go live!

---

## 🤝 How I Can Help

I can assist with:

✅ **Database schema design** - Optimize for performance and maintainability  
✅ **TypeScript type generation** - Full type safety  
✅ **Component library setup** - shadcn/ui + custom components  
✅ **State management** - Zustand + TanStack Query patterns  
✅ **RLS policy design** - Security best practices  
✅ **Edge Function development** - QB sync, email notifications  
✅ **Testing strategy** - Unit, integration, E2E tests  
✅ **Deployment automation** - CI/CD with GitHub Actions  
✅ **Code reviews** - Architecture and performance feedback  
✅ **Troubleshooting** - Debug issues as they arise  

---

**Ready to start?** Let's begin with Phase 0 - I can help you:
1. Create the initial database schema SQL
2. Set up the React + TypeScript project
3. Configure Supabase client with RLS
4. Build your first protected route

Just say the word! 🚀
