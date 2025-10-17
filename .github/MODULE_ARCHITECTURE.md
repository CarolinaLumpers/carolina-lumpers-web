# Carolina Lumpers: Module Architecture & Feature Mapping

**Last Updated**: October 17, 2025  
**Purpose**: Ensure complete feature parity between current and new system

---

## 📦 Current System Modules (What You Have Now)

### **1. Time Tracking & Clock-In**
**Current Implementation**:
- `EmployeeLogin` (Apps Script) - GPS-based clock-in
- `ClockinFlow` (Apps Script) - NFC tag/QR code clock-in
- `employeeDashboard.html` - Frontend UI
- `ClockIn` sheet (411 rows) - Data storage

**Features**:
- ✅ GPS coordinate capture (lat/lng)
- ✅ Geofence validation (0.3 mi radius)
- ✅ Device detection (iPhone - Safari, Android - Chrome, etc.)
- ✅ Work hours validation (7am - midnight)
- ✅ Duplicate scan detection (20-minute window)
- ✅ Nearest client calculation
- ✅ Distance tracking (miles)
- ✅ Weekly history view (current week only)
- ✅ Offline clock-in queue (IndexedDB)
- ✅ Biometric login (Face ID/Touch ID)
- ✅ Multi-language support (English, Spanish, Portuguese)

**Data Written**:
```javascript
ClockIn Row = {
  ClockinID: "CLK-123456",
  WorkerID: "CLS001",
  Date: "10/17/2025",
  Time: "14:30:00",
  Latitude: 35.7796,
  Longitude: -78.6382,
  "Nearest Client": "ABC Warehouse",
  "Distance (mi)": 0.15,
  EditStatus: "confirmed",
  "Needs Processing": true  // For NFC only
}
```

---

### **2. Time Edit Requests**
**Current Implementation**:
- `TimeEditRequests` sheet (2 rows)
- `employeeDashboard.html` - Submit request UI
- Admin dashboard - Approve/deny UI

**Features**:
- ✅ Worker submits edit request with reason
- ✅ Shows original time vs requested time
- ✅ Admin approval workflow
- ✅ Email notification to admin
- ✅ Status tracking (pending/approved/denied)
- ✅ Updates ClockIn.EditStatus on approval
- ✅ Centralized logging (Activity_Logs)

**Data Flow**:
```
Worker submits edit
  ↓
TimeEditRequests sheet (WorkerID, ClockinID, RequestedTime, Reason, Status)
  ↓
Admin reviews in dashboard
  ↓
Approve → ClockIn.Time updated + ClockIn.EditStatus = "confirmed"
  ↓
Activity_Logs (TIME_EDIT_APPROVAL event)
  ↓
Email sent to worker
```

---

### **3. Task Management**
**Current Implementation**:
- `Tasks` sheet (336 rows)
- AppSheet mobile UI
- AppSheet bots for automation

**Features**:
- ✅ Task creation (manual or batch)
- ✅ Worker assignment
- ✅ Date/time scheduling
- ✅ Start Time, End Time, Break tracking
- ✅ Client/site association
- ✅ TaskID generation (BATCHTASK-YYMMDD-UUID)
- ✅ Batch clock-in (multiple workers, same shift)
- ✅ Auto-link to clock-ins (via AppSheet bot)

**Data Structure**:
```javascript
Task = {
  TaskID: "BATCHTASK-251017-A1B2",
  Worker: "CLS001",
  Date: "10/17/2025",
  "Start Time": "08:00",
  "End Time": "16:00",
  "Break (Minutes)": 30,
  Site: "ABC Warehouse",
  ServiceItem: "Unloading",
  BatchClockinID: "BATCH-123" // If from batch
}
```

---

### **4. Worker Management**
**Current Implementation**:
- `Workers` sheet (37 rows)
- Manual entry/editing

**Features**:
- ✅ Worker profile (ID, name, email, phone)
- ✅ Role assignment (Admin, Lead, Worker)
- ✅ Hourly rate + bonuses
- ✅ Availability status (active/inactive)
- ✅ App access control
- ✅ Primary language (en/es/pt)
- ✅ Display name generation
- ✅ QuickBooks ID (QBOID)
- ✅ Photo/document storage (URLs)

**Authentication**:
- Email + password (hashed in backend)
- `whoami` endpoint returns role
- Session stored in localStorage

---

### **5. Payroll Generation**
**Current Implementation**:
- `Payroll LineItems` sheet (321 rows)
- Apps Script generation function
- Manual CSV export to QuickBooks

**Features**:
- ✅ Weekly payroll batches
- ✅ Calculate hours from ClockIn records
- ✅ Apply hourly rates + bonuses
- ✅ Break time deductions
- ✅ Overtime calculation (if applicable)
- ✅ Group by worker + week
- ✅ PDF report generation
- ✅ Email delivery to admin

**Calculation Logic**:
```javascript
// For each worker, per week:
hours = SUM(ClockIn records for worker this week)
breakMinutes = SUM(Break from Tasks linked to clock-ins)
netHours = hours - (breakMinutes / 60)
pay = netHours * hourlyRate + flatRateBonus
```

---

### **6. Invoice Management**
**Current Implementation**:
- `Invoices` sheet (14 rows)
- `Invoice LineItems` sheet (340 rows)
- Manual creation

**Features**:
- ✅ Invoice creation per client
- ✅ Line items (job/task breakdown)
- ✅ Hourly billing or flat rate
- ✅ Tax calculation
- ✅ Status tracking (draft/sent/paid)
- ✅ Payment tracking
- ✅ PDF generation
- ✅ QuickBooks sync (manual)

**Data Structure**:
```javascript
Invoice = {
  InvoiceID: "INV-2025-001",
  ClientID: "CLIENT001",
  Date: "10/17/2025",
  Status: "sent",
  Subtotal: 1500.00,
  Tax: 105.00,
  Total: 1605.00,
  QB_InvoiceID: "1234" // After sync
}

InvoiceLineItem = {
  LineItemID: "LINE-001",
  InvoiceID: "INV-2025-001",
  TaskID: "BATCHTASK-251017-A1B2",
  Description: "Unloading - 8 hours",
  Quantity: 8,
  Rate: 25.00,
  Amount: 200.00
}
```

---

### **7. Client Management**
**Current Implementation**:
- `Clients` sheet (3 rows)
- Manual entry

**Features**:
- ✅ Client profile (name, contact info)
- ✅ Site addresses with GPS coordinates
- ✅ Geofence radius per site
- ✅ QuickBooks customer ID
- ✅ Billing information
- ✅ Active/inactive status

---

### **8. Job Applications**
**Current Implementation**:
- `apply.html` - 6-step wizard form
- Job Application Web App (Apps Script)
- `CLS_AppSheet_Application_Form` spreadsheet (7 rows)

**Features**:
- ✅ Public application form
- ✅ Multi-step wizard (personal, location, work auth, preferences, emergency, language)
- ✅ Multi-language form (en/es/pt)
- ✅ 18+ age validation
- ✅ File upload (resume, work authorization docs)
- ✅ Status tracking (new/contacted/interview/hired/rejected)
- ✅ Status history audit trail
- ✅ Disqualification reasons
- ✅ Referral source tracking

**Application Data**:
```javascript
Application = {
  application_id: "APP-123",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  dob: "1990-01-01",
  city: "Raleigh",
  state: "NC",
  role_applied: "Warehouse Worker",
  experience_level: "intermediate",
  shift_preference: "morning",
  work_authorization: "us_citizen",
  transportation: true,
  driver_license: true,
  language_preference: "english",
  english_proficiency: "fluent",
  status: "new"
}
```

---

### **9. Centralized Logging**
**Current Implementation**:
- `Activity_Logs` sheet (22 rows)
- CLLogger library (v1.2.0)
- TT_LOGGER wrapper (EmployeeLogin)

**Features**:
- ✅ Structured event logging (14 columns)
- ✅ Event types (CLOCK_IN, LOGIN, TIME_EDIT, ERROR, etc.)
- ✅ Worker identification
- ✅ Device tracking
- ✅ GPS coordinates (for location events)
- ✅ Distance tracking
- ✅ Status tracking (SUCCESS/PENDING/ERROR)
- ✅ JSON details column (full context)
- ✅ Project categorization (TIME_TRACKING, etc.)

**Log Entry Structure**:
```javascript
ActivityLog = {
  "Log ID": "LOG-20251017123134-TQUD",
  Timestamp: "10/17/2025 12:31:34",
  "Event Type": "CLOCK_IN",
  "Worker ID": "CLS001",
  "Display Name": "John Doe",
  "Event Summary": "Clock-in at ABC Warehouse",
  Device: "iPhone - Safari",
  Site: "ABC Warehouse",
  "Distance (miles)": 0.15,
  Latitude: 35.7796,
  Longitude: -78.6382,
  Status: "SUCCESS",
  Project: "TIME_TRACKING",
  Details: { clockinID: "CLK-123", minutesLate: 0 }
}
```

---

### **10. Batch Operations**
**Current Implementation**:
- `Batch Clockin` sheet (24 rows)
- `BatchClockin.js` (Apps Script)
- AppSheet API integration

**Features**:
- ✅ Create multiple tasks at once
- ✅ Same shift for multiple workers
- ✅ Update existing tasks
- ✅ Delete removed workers
- ✅ AppSheet API calls (Add/Edit/Delete)
- ✅ Break time calculation (lunch yes/no)

**Use Case**:
```
Admin knows 5 workers are doing same job today:
- Date: 10/17/2025
- Start: 8:00 AM
- End: 4:00 PM
- Lunch: Yes (30 min break)
- Workers: CLS001, CLS002, CLS003, CLS004, CLS005

One batch submission creates 5 tasks
```

---

## 🏗️ New System Modules (What You'll Build)

### **Module 1: Authentication & Authorization**
**Technology**: Supabase Auth + RLS

**Features to Implement**:
- ✅ Magic link login (email)
- ✅ Optional password login
- ✅ Biometric login (WebAuthn)
- ✅ Multi-factor authentication (MFA)
- ✅ Role-based access control (RBAC)
- ✅ Company isolation (multi-tenant)
- ✅ Session management (JWT tokens)
- ✅ Password reset flow
- ✅ Account verification

**Database Tables**:
```sql
-- Extends Supabase auth.users
users (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('admin', 'supervisor', 'worker', 'client')),
  created_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
)

-- RLS Policy Example
CREATE POLICY "users_view_own_company"
ON users FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
```

---

### **Module 2: Time Tracking (Unified)**
**Technology**: React + Supabase + PostgreSQL triggers

**Features to Implement**:
- ✅ Single clock-in API (replaces GPS + NFC)
- ✅ GPS coordinate capture
- ✅ Geofence validation (PostgreSQL function)
- ✅ Device detection (user agent parsing)
- ✅ Work hours validation
- ✅ Duplicate detection (query last shift)
- ✅ Nearest site calculation (PostGIS or custom)
- ✅ Distance tracking
- ✅ Clock-out functionality
- ✅ Auto clock-out (after 12 hours)
- ✅ Break tracking (start/end break)
- ✅ Shift summary (hours worked, break time)
- ✅ Multi-language UI
- ✅ Offline queue (IndexedDB + sync)
- ✅ Real-time updates (Supabase Realtime)

**Database Schema**:
```sql
shifts (
  id UUID PRIMARY KEY,
  worker_id UUID REFERENCES workers(id),
  site_id UUID REFERENCES sites(id),
  task_id UUID REFERENCES tasks(id), -- Optional link
  
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  
  clock_in_latitude NUMERIC(10, 7),
  clock_in_longitude NUMERIC(10, 7),
  clock_in_distance_miles NUMERIC(5, 2),
  clock_in_device TEXT,
  
  clock_out_latitude NUMERIC(10, 7),
  clock_out_longitude NUMERIC(10, 7),
  
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  break_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (break_end_time - break_start_time)) / 60
  ) STORED,
  
  hours_worked NUMERIC(5, 2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600 - COALESCE(break_minutes, 0) / 60
  ) STORED,
  
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'edited')),
  edit_approved BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence validation trigger
CREATE TRIGGER validate_shift_geofence
  BEFORE INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION validate_geofence();

-- Auto-link to active task
CREATE TRIGGER auto_link_shift_to_task
  BEFORE INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION link_to_active_task();
```

**API Endpoints** (via Supabase PostgREST):
```typescript
// Clock in
POST /rest/v1/rpc/clock_in
Body: {
  worker_id: "uuid",
  site_id: "uuid",
  latitude: 35.7796,
  longitude: -78.6382,
  device: "iPhone - Safari"
}
Response: { shift_id: "uuid", status: "success" }

// Clock out
POST /rest/v1/rpc/clock_out
Body: {
  shift_id: "uuid",
  latitude: 35.7796,
  longitude: -78.6382
}

// Get worker's shifts (this week)
GET /rest/v1/shifts?worker_id=eq.{uuid}&clock_in_time=gte.{monday}
```

---

### **Module 3: Time Edit Workflow**
**Technology**: React + Supabase RLS + Edge Functions

**Features to Implement**:
- ✅ Submit edit request (worker)
- ✅ View pending requests (supervisor/admin)
- ✅ Approve/deny request (supervisor/admin)
- ✅ Email notifications (Edge Function)
- ✅ SMS notifications (optional, Twilio)
- ✅ Audit trail (who approved, when)
- ✅ Reason tracking
- ✅ Bulk approval (multiple requests)
- ✅ Auto-deny after 7 days (scheduled job)

**Database Schema**:
```sql
shift_edits (
  id UUID PRIMARY KEY,
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  requested_by UUID REFERENCES users(id),
  
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Workers can submit and view their own
CREATE POLICY "workers_manage_own_edits"
ON shift_edits FOR ALL
USING (worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid()));

-- RLS: Supervisors can review
CREATE POLICY "supervisors_review_edits"
ON shift_edits FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() 
  AND role IN ('supervisor', 'admin')
));

-- Trigger: Update shift on approval
CREATE TRIGGER apply_approved_edit
  AFTER UPDATE ON shift_edits
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION apply_time_edit();
```

**UI Components**:
```typescript
// src/features/shifts/SubmitEditRequest.tsx
<Form onSubmit={submitEdit}>
  <DateTimePicker name="requested_clock_in" />
  <DateTimePicker name="requested_clock_out" />
  <Textarea name="reason" required />
  <Button type="submit">Submit Request</Button>
</Form>

// src/features/shifts/PendingEditRequests.tsx
<Table>
  {pendingEdits.map(edit => (
    <TableRow>
      <TableCell>{edit.worker.display_name}</TableCell>
      <TableCell>{formatDateTime(edit.requested_clock_in)}</TableCell>
      <TableCell>{edit.reason}</TableCell>
      <TableCell>
        <Button onClick={() => approve(edit.id)}>Approve</Button>
        <Button variant="destructive" onClick={() => deny(edit.id)}>Deny</Button>
      </TableCell>
    </TableRow>
  ))}
</Table>
```

---

### **Module 4: Task Management**
**Technology**: React + Supabase + Drag-and-Drop UI

**Features to Implement**:
- ✅ Create task (manual)
- ✅ Batch create tasks (multiple workers)
- ✅ Assign worker to task
- ✅ Schedule task (date/time)
- ✅ Link task to job/project
- ✅ Auto-link shifts to tasks
- ✅ Task status tracking (assigned/in_progress/completed/cancelled)
- ✅ Task board view (Kanban)
- ✅ Calendar view
- ✅ Filter by worker, site, date
- ✅ Task templates (recurring tasks)

**Database Schema**:
```sql
projects (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

jobs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  name TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tasks (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  
  name TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  
  actual_start TIMESTAMPTZ, -- From shift.clock_in_time
  actual_end TIMESTAMPTZ,   -- From shift.clock_out_time
  
  status TEXT DEFAULT 'assigned' CHECK (status IN (
    'assigned', 'in_progress', 'completed', 'cancelled'
  )),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Update task status when shift starts
CREATE TRIGGER update_task_on_shift_start
  AFTER INSERT ON shifts
  FOR EACH ROW
  WHEN (NEW.task_id IS NOT NULL)
  EXECUTE FUNCTION update_task_status();
```

**UI Components**:
```typescript
// src/features/tasks/TaskBoard.tsx
<DndContext onDragEnd={handleDragEnd}>
  <Column title="Assigned">
    {assignedTasks.map(task => (
      <TaskCard key={task.id} task={task} />
    ))}
  </Column>
  <Column title="In Progress">
    {inProgressTasks.map(task => (
      <TaskCard key={task.id} task={task} />
    ))}
  </Column>
  <Column title="Completed">
    {completedTasks.map(task => (
      <TaskCard key={task.id} task={task} />
    ))}
  </Column>
</DndContext>

// src/features/tasks/CreateTaskForm.tsx
<Form onSubmit={createTask}>
  <Select name="job_id" options={jobs} />
  <Select name="worker_id" options={workers} />
  <DateTimePicker name="scheduled_start" />
  <DateTimePicker name="scheduled_end" />
  <Textarea name="description" />
  <Button type="submit">Create Task</Button>
</Form>
```

---

### **Module 5: Payroll Generation**
**Technology**: Supabase Edge Function + PDF Generation

**Features to Implement**:
- ✅ Weekly payroll calculation
- ✅ Hours from shifts (completed status)
- ✅ Break time deduction
- ✅ Overtime calculation (> 40 hours)
- ✅ Apply hourly rates
- ✅ Apply bonuses
- ✅ Group by worker + period
- ✅ Generate PDF report
- ✅ Email to admin
- ✅ Export to CSV (QB import format)
- ✅ Manual approval before QB sync
- ✅ Lock periods (prevent changes)

**Database Schema**:
```sql
payroll_periods (
  id UUID PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'synced', 'locked')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  qb_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(start_date, end_date)
);

payroll_line_items (
  id UUID PRIMARY KEY,
  payroll_period_id UUID REFERENCES payroll_periods(id),
  worker_id UUID REFERENCES workers(id),
  shift_id UUID REFERENCES shifts(id),
  
  date DATE,
  hours_worked NUMERIC(5, 2),
  break_minutes INTEGER,
  net_hours NUMERIC(5, 2),
  
  hourly_rate NUMERIC(10, 2),
  regular_hours NUMERIC(5, 2),
  overtime_hours NUMERIC(5, 2),
  
  regular_pay NUMERIC(10, 2),
  overtime_pay NUMERIC(10, 2),
  bonus NUMERIC(10, 2),
  total_pay NUMERIC(10, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function: Generate payroll for period
CREATE OR REPLACE FUNCTION generate_payroll(
  p_start_date DATE,
  p_end_date DATE
) RETURNS UUID AS $$
DECLARE
  v_period_id UUID;
BEGIN
  -- Create period
  INSERT INTO payroll_periods (start_date, end_date)
  VALUES (p_start_date, p_end_date)
  RETURNING id INTO v_period_id;
  
  -- Calculate line items from shifts
  INSERT INTO payroll_line_items (
    payroll_period_id, worker_id, shift_id, date,
    hours_worked, break_minutes, net_hours,
    hourly_rate, regular_hours, overtime_hours,
    regular_pay, overtime_pay, bonus, total_pay
  )
  SELECT
    v_period_id,
    s.worker_id,
    s.id,
    DATE(s.clock_in_time),
    s.hours_worked,
    s.break_minutes,
    s.hours_worked - COALESCE(s.break_minutes, 0) / 60 AS net_hours,
    w.hourly_rate,
    LEAST(s.hours_worked, 8) AS regular_hours,
    GREATEST(s.hours_worked - 8, 0) AS overtime_hours,
    LEAST(s.hours_worked, 8) * w.hourly_rate AS regular_pay,
    GREATEST(s.hours_worked - 8, 0) * w.hourly_rate * 1.5 AS overtime_pay,
    w.flat_rate_bonus AS bonus,
    (LEAST(s.hours_worked, 8) * w.hourly_rate) +
    (GREATEST(s.hours_worked - 8, 0) * w.hourly_rate * 1.5) +
    COALESCE(w.flat_rate_bonus, 0) AS total_pay
  FROM shifts s
  JOIN workers w ON w.id = s.worker_id
  WHERE s.status = 'completed'
    AND DATE(s.clock_in_time) BETWEEN p_start_date AND p_end_date;
  
  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql;
```

**Edge Function**:
```typescript
// supabase/functions/generate-payroll-report/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

serve(async (req) => {
  const { period_id } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Get payroll data
  const { data: lineItems } = await supabase
    .from('payroll_line_items')
    .select('*, workers(*)')
    .eq('payroll_period_id', period_id)
  
  // Generate PDF
  const pdf = await PDFDocument.create()
  const page = pdf.addPage()
  
  // Add content (worker name, hours, pay, etc.)
  // ...
  
  const pdfBytes = await pdf.save()
  
  // Send email
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: { email: 'payroll@carolinalumpers.com' },
      to: [{ email: 'admin@carolinalumpers.com' }],
      subject: `Payroll Report - Week of ${startDate}`,
      attachments: [{
        content: btoa(String.fromCharCode(...pdfBytes)),
        filename: 'payroll.pdf',
        type: 'application/pdf'
      }]
    })
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

---

### **Module 6: Invoice Management**
**Technology**: React + Supabase + QuickBooks API

**Features to Implement**:
- ✅ Create invoice (manual)
- ✅ Auto-generate from completed jobs
- ✅ Add line items (tasks/hours)
- ✅ Hourly or flat rate billing
- ✅ Tax calculation (by state)
- ✅ Discount support
- ✅ Status tracking (draft/sent/paid/overdue)
- ✅ Payment tracking (partial/full)
- ✅ PDF generation
- ✅ Email to client
- ✅ QB sync (automated)
- ✅ Payment reminders (scheduled)

**Database Schema**:
```sql
invoices (
  id UUID PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  subtotal NUMERIC(10, 2),
  tax_rate NUMERIC(5, 4),
  tax_amount NUMERIC(10, 2),
  discount_amount NUMERIC(10, 2),
  total_amount NUMERIC(10, 2),
  
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  balance_due NUMERIC(10, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  qb_invoice_id TEXT,
  qb_synced_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

invoice_line_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2),
  rate NUMERIC(10, 2),
  amount NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * rate) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Update invoice totals when line items change
CREATE TRIGGER update_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION recalculate_invoice_totals();

-- Function: Auto-update status to overdue
CREATE OR REPLACE FUNCTION check_overdue_invoices() RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'sent'
    AND due_date < CURRENT_DATE
    AND balance_due > 0;
END;
$$ LANGUAGE plpgsql;

-- Schedule: Run daily
SELECT cron.schedule(
  'check-overdue-invoices',
  '0 0 * * *',
  $$ SELECT check_overdue_invoices() $$
);
```

---

### **Module 7: Client Portal**
**Technology**: React (separate route) + Supabase RLS

**Features to Implement**:
- ✅ Client login (magic link)
- ✅ View projects (assigned to client)
- ✅ View invoices (with payment status)
- ✅ Download invoice PDFs
- ✅ View job progress
- ✅ Contact support
- ✅ Read-only access (no edits)
- ✅ Multi-client support (one login, multiple sites)

**RLS Policies**:
```sql
-- Clients can only see their own data
CREATE POLICY "clients_view_own_projects"
ON projects FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON u.email = c.email
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "clients_view_own_invoices"
ON invoices FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON u.email = c.email
    WHERE u.id = auth.uid()
  )
);
```

---

### **Module 8: Job Applications**
**Technology**: React + Supabase + Storage

**Features to Implement**:
- ✅ Public application form (6-step wizard)
- ✅ Multi-language (en/es/pt)
- ✅ Age validation (18+)
- ✅ File upload (resume, work docs) → Supabase Storage
- ✅ Status tracking (new/contacted/interview/hired/rejected)
- ✅ Status history (audit trail)
- ✅ Disqualification reasons
- ✅ Admin review interface
- ✅ Convert to worker (hired → create user + worker)
- ✅ Email notifications (status changes)

**Database Schema**:
```sql
applicants (
  id UUID PRIMARY KEY,
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  dob DATE,
  
  city TEXT,
  state TEXT,
  
  role_applied TEXT,
  experience_level TEXT,
  shift_preference TEXT,
  work_authorization TEXT,
  
  transportation BOOLEAN,
  driver_license BOOLEAN,
  
  language_preference TEXT,
  english_proficiency TEXT,
  
  resume_url TEXT, -- Supabase Storage path
  work_docs_url TEXT,
  
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'interview', 'hired', 'rejected'
  )),
  
  referral_source TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

applicant_status_history (
  id UUID PRIMARY KEY,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  reason_code TEXT,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Log status changes
CREATE TRIGGER track_applicant_status
  AFTER UPDATE ON applicants
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_status_change();

-- Function: Convert applicant to worker
CREATE OR REPLACE FUNCTION convert_to_worker(p_applicant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_worker_id UUID;
  v_applicant RECORD;
BEGIN
  -- Get applicant data
  SELECT * INTO v_applicant FROM applicants WHERE id = p_applicant_id;
  
  -- Create user (auth)
  INSERT INTO auth.users (email, email_confirmed_at)
  VALUES (v_applicant.email, NOW())
  RETURNING id INTO v_user_id;
  
  -- Create user profile
  INSERT INTO users (id, email, role)
  VALUES (v_user_id, v_applicant.email, 'worker');
  
  -- Create worker
  INSERT INTO workers (
    user_id, first_name, last_name, phone,
    primary_language, status
  )
  VALUES (
    v_user_id, v_applicant.first_name, v_applicant.last_name,
    v_applicant.phone, v_applicant.language_preference, 'active'
  )
  RETURNING id INTO v_worker_id;
  
  -- Update applicant status
  UPDATE applicants
  SET status = 'hired', worker_id = v_worker_id
  WHERE id = p_applicant_id;
  
  RETURN v_worker_id;
END;
$$ LANGUAGE plpgsql;
```

---

### **Module 9: Audit Logging (Centralized)**
**Technology**: PostgreSQL Triggers + Supabase

**Features to Implement**:
- ✅ Audit all table changes (INSERT/UPDATE/DELETE)
- ✅ Track user who made change
- ✅ Store before/after values
- ✅ Event categorization
- ✅ Searchable logs
- ✅ Retention policy (archive after 1 year)

**Database Schema**:
```sql
audit_logs (
  id UUID PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  event_type TEXT, -- CLOCK_IN, TIME_EDIT, etc.
  event_summary TEXT,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, user_id, old_values
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, user_id, old_values, new_values, changed_fields
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW),
      ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, user_id, new_values
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all important tables
CREATE TRIGGER audit_shifts AFTER INSERT OR UPDATE OR DELETE ON shifts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
  
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- etc.
```

---

## 🔄 Feature Mapping Matrix

| Current Feature | Current Implementation | New Implementation | Status |
|----------------|----------------------|-------------------|--------|
| **GPS Clock-In** | EmployeeLogin (Apps Script) | Module 2: shifts table + RLS | ✅ Planned |
| **NFC Clock-In** | ClockinFlow (Apps Script) | Module 2: Same as GPS (unified) | ✅ Planned |
| **Geofence Validation** | Apps Script function | PostgreSQL trigger | ✅ Planned |
| **Device Detection** | Frontend (getDeviceInfo) | Frontend + stored in DB | ✅ Planned |
| **Duplicate Detection** | CacheService + query | PostgreSQL query | ✅ Planned |
| **Time Edit Requests** | TimeEditRequests sheet | Module 3: shift_edits table | ✅ Planned |
| **Time Edit Approval** | Admin dashboard | Module 3: React UI + RLS | ✅ Planned |
| **Task Assignment** | AppSheet UI + Tasks sheet | Module 4: tasks table + Kanban | ✅ Planned |
| **Batch Task Creation** | BatchClockin.js + AppSheet API | Module 4: Batch form + API | ✅ Planned |
| **Auto-link Shifts to Tasks** | AppSheet bot (hourly) | PostgreSQL trigger (instant) | ✅ Planned |
| **Payroll Generation** | Apps Script + manual export | Module 5: Edge Function + QB API | ✅ Planned |
| **Invoice Creation** | Manual in Sheets | Module 6: React UI + automation | ✅ Planned |
| **QuickBooks Sync** | Manual CSV export | Module 6: Automated API sync | ✅ Planned |
| **Job Applications** | apply.html + Apps Script | Module 8: React form + Supabase | ✅ Planned |
| **Hiring Workflow** | AppSheet (but broken) | Module 8: Full automation | ✅ Planned |
| **Activity Logging** | Activity_Logs sheet + CLLogger | Module 9: audit_logs + triggers | ✅ Planned |
| **Worker Management** | Workers sheet (manual) | users + workers tables + CRUD UI | ✅ Planned |
| **Client Management** | Clients sheet (manual) | clients + sites tables + CRUD UI | ✅ Planned |
| **Biometric Login** | WebAuthn (frontend only) | Supabase Auth + WebAuthn | ✅ Planned |
| **Multi-language** | data-en/es/pt attributes | i18next library | ✅ Planned |
| **Offline Support** | Service worker + IndexedDB | TanStack Query persistence | ✅ Planned |
| **PWA Manifest** | manifest-employee.json | Vite PWA plugin | ✅ Planned |
| **Role-based Access** | localStorage + API checks | Supabase RLS policies | ✅ Planned |
| **Reports** | Apps Script + Sheets formulas | React UI + SQL views | ✅ Planned |

---

## 🎯 Critical Dependencies

### Module Dependencies (Build Order)
```
Foundation (Week 1-2)
├─ Module 1: Auth & Authorization
└─ Database schema setup

Core Features (Week 3-6)
├─ Module 2: Time Tracking (depends on Module 1)
├─ Module 3: Time Edits (depends on Module 2)
└─ Module 4: Tasks (depends on Module 2)

Business Logic (Week 7-10)
├─ Module 5: Payroll (depends on Module 2, 4)
├─ Module 6: Invoices (depends on Module 4)
└─ Module 9: Audit Logging (depends on all)

External Integrations (Week 9-10)
├─ QuickBooks API (depends on Module 5, 6)
└─ Email/SMS (depends on Module 3, 8)

Optional Features (Week 11+)
├─ Module 7: Client Portal (depends on Module 6)
└─ Module 8: Applications (independent)
```

---

## 📊 Success Criteria

### Feature Parity Checklist
- [ ] All 37 workers can clock in/out
- [ ] Geofence validation matches current accuracy
- [ ] Offline clock-ins sync successfully
- [ ] Time edit workflow complete
- [ ] Task assignment functional
- [ ] Payroll calculation matches old system (to the penny)
- [ ] Invoice generation works
- [ ] QuickBooks sync successful
- [ ] All audit logs captured
- [ ] Multi-language UI works
- [ ] Biometric login works

### Performance Criteria
- [ ] Clock-in latency < 2 seconds
- [ ] Dashboard load < 1 second
- [ ] Offline sync < 30 seconds
- [ ] Reports generate < 5 seconds
- [ ] QuickBooks sync < 10 minutes

### Data Integrity Criteria
- [ ] 0 duplicate shifts
- [ ] 100% shift-task linkage accuracy
- [ ] 100% audit log coverage
- [ ] 0 orphaned records (foreign keys enforced)

---

## 🚀 Next Steps

Now that modules are documented, we can:

1. **Start with Module 1** - Auth foundation
2. **Build Module 2** - Core time tracking (most critical)
3. **Add Module 3** - Time edits (most requested feature)
4. **Implement Module 4** - Task management
5. **Continue through other modules** - Based on priority

Want to start building? I can help you:
- ✅ Write the complete database schema SQL
- ✅ Generate TypeScript types from schema
- ✅ Set up the React project structure
- ✅ Build your first module (Auth or Time Tracking)

What would you like to tackle first? 🎯
