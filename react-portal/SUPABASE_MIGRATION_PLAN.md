# CLS Supabase Migration Implementation Plan
**Carolina Lumpers Service: Google Apps Script → Supabase + Vercel**

## 📊 Migration Overview

### Current System
- **Backend:** Google Apps Script (9 modules, ~3000 lines)
- **Database:** Google Sheets (22 sheets, ~2000 rows)  
- **Frontend:** React Portal (95% complete)
- **Hosting:** Google Cloud Storage + Cloudflare Workers
- **Cost:** $0/month
- **Performance:** 2-5 second API responses
- **Users:** 15 active employees

### Target System  
- **Backend:** Supabase (PostgreSQL + Auth + Real-time)
- **Database:** PostgreSQL (10 tables replacing 22 sheets)
- **Frontend:** React Portal (existing codebase)
- **Hosting:** Vercel (free tier)  
- **Cost:** $0/month (free tiers)
- **Performance:** 200ms API responses (10x improvement)
- **Users:** Same 15 employees + room to scale to 100+

---

## 🎯 Migration Strategy

### **Parallel Implementation (Zero Downtime)**
1. **Keep Google system running** during migration
2. **Build Supabase system alongside** existing infrastructure  
3. **Test thoroughly** with subset of employees
4. **Switch over** when Supabase system is stable
5. **Gradual decommission** of Google system

### **Rollback Plan**
- Google Apps Script system remains operational throughout migration
- Can instantly rollback by changing API endpoint in React Portal
- No data loss risk - both systems maintain independent datasets initially

---

## 📅 Implementation Timeline

### **Week 1: Supabase Foundation**

#### **Day 1-2: Project Setup**
- [ ] Create Supabase account and project
- [ ] Configure project settings (region: US East)
- [ ] Set up development environment
- [ ] Create initial database schema

#### **Day 3-4: Database Design**  
- [ ] Map Google Sheets to PostgreSQL tables (22 sheets → 10 tables)
- [ ] Design Row Level Security (RLS) policies
- [ ] Create database functions for business logic
- [ ] Set up automated backups

#### **Day 5-7: Authentication System**
- [ ] Configure Supabase Auth
- [ ] Set up user roles (Worker, Lead, Admin) 
- [ ] Create auth policies and permissions
- [ ] Test authentication flows

### **Week 2: API Migration**

#### **Day 8-10: Core APIs**
- [ ] Replace login/signup endpoints
- [ ] Migrate clock-in functionality  
- [ ] Convert worker management APIs
- [ ] Implement payroll queries

#### **Day 11-12: Admin Features**
- [ ] Migrate time edit request system
- [ ] Convert W-9 management features
- [ ] Implement admin reporting APIs
- [ ] Add real-time subscriptions

#### **Day 13-14: Testing & Validation**
- [ ] Unit test all new APIs
- [ ] Performance testing (response times)
- [ ] Data integrity validation
- [ ] Cross-browser testing

### **Week 3: Deployment & Migration**

#### **Day 15-16: Deployment Setup**
- [ ] Configure Vercel project
- [ ] Set up environment variables
- [ ] Configure custom domain
- [ ] Test production deployment

#### **Day 17-19: Parallel Testing**
- [ ] Deploy React Portal with feature flags
- [ ] Test with 2-3 volunteer employees
- [ ] Compare data between systems
- [ ] Performance monitoring

#### **Day 20-21: Full Migration**
- [ ] Switch all employees to Supabase system
- [ ] Monitor for issues
- [ ] Validate all features working
- [ ] Decommission Google system (optional)

---

## 🗄️ Database Schema Design

### **Core Tables (10 tables replacing 22 sheets)**

#### **1. workers**
```sql
CREATE TABLE workers (
  id TEXT PRIMARY KEY,                    -- WorkerID (e.g., "CLS001")
  employee_id TEXT,                       -- Employee ID
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,  
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('Lumper', 'Lead', 'Manager')),
  app_access TEXT CHECK (app_access IN ('Worker', 'Lead', 'Admin')), 
  hourly_rate DECIMAL(5,2),
  flat_rate_bonus DECIMAL(6,2),
  availability TEXT DEFAULT 'Active',
  primary_language TEXT DEFAULT 'en',
  w9_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **2. clock_ins**  
```sql
CREATE TABLE clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  nearest_client TEXT,
  distance_miles DECIMAL(4,2),
  edit_status TEXT DEFAULT 'confirmed' CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
  notes TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **3. time_edit_requests**
```sql
CREATE TABLE time_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  clockin_id UUID REFERENCES clock_ins(id) NOT NULL,
  original_time TIME NOT NULL,
  requested_time TIME NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by TEXT REFERENCES workers(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **4. w9_records**
```sql
CREATE TABLE w9_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  display_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  tax_classification TEXT NOT NULL,
  address TEXT NOT NULL,
  ssn_last4 TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  pdf_url TEXT,
  reviewed_by TEXT REFERENCES workers(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **5. clients** (replaces multiple location sheets)
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,                    -- ClientID
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),  
  geofence_radius_miles DECIMAL(4,2) DEFAULT 0.3,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **6. payroll_line_items**
```sql
CREATE TABLE payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  date DATE NOT NULL,
  client_id TEXT REFERENCES clients(id),
  line_item_detail TEXT NOT NULL,
  check_amount DECIMAL(8,2) NOT NULL,
  week_period DATE NOT NULL,              -- Saturday date for week
  run_payroll BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Additional Tables:**
- **activity_logs** (centralized logging)
- **auth_sessions** (session management)  
- **file_uploads** (W-9 PDFs, photos)
- **system_config** (app settings)

---

## 🔐 Row Level Security (RLS) Policies

### **Worker Data Access**
```sql
-- Workers can only see their own data
CREATE POLICY "Workers see own data" ON workers
  FOR SELECT USING (auth.uid()::text = id);

-- Workers can only see their own clock-ins  
CREATE POLICY "Workers see own clock-ins" ON clock_ins
  FOR SELECT USING (auth.uid()::text = worker_id);

-- Admins can see all data
CREATE POLICY "Admins see all workers" ON workers  
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.id = auth.uid()::text 
      AND w.app_access = 'Admin'
    )
  );
```

### **Time Edit Requests**
```sql
-- Workers can create requests for their own clock-ins
CREATE POLICY "Workers create own requests" ON time_edit_requests
  FOR INSERT WITH CHECK (auth.uid()::text = worker_id);

-- Admins can approve/deny requests  
CREATE POLICY "Admins manage requests" ON time_edit_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = auth.uid()::text
      AND w.app_access IN ('Admin', 'Lead')
    )  
  );
```

---

## 🔄 API Migration Mapping

### **Authentication APIs**
```javascript
// BEFORE: Google Apps Script
const response = await fetch(`${API_BASE}?action=login&email=${email}&password=${password}`);

// AFTER: Supabase  
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});
```

### **Clock-in APIs**
```javascript
// BEFORE: Google Apps Script
const response = await api.clockIn(workerId, lat, lng, lang, email);

// AFTER: Supabase
const { data, error } = await supabase
  .from('clock_ins')
  .insert({
    worker_id: workerId,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    latitude: lat,
    longitude: lng,
    device: getDeviceInfo().displayString
  });
```

### **Real-time Updates (New Feature)**
```javascript
// NEW: Real-time clock-in updates for admin dashboard
useEffect(() => {
  const channel = supabase
    .channel('clock-ins')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public', 
      table: 'clock_ins'
    }, (payload) => {
      // Update UI immediately when new clock-ins arrive
      queryClient.invalidateQueries(['clock-ins-today']);
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, []);
```

### **Payroll APIs**  
```javascript
// BEFORE: Google Apps Script
const payroll = await api.getPayroll(workerId, range);

// AFTER: Supabase with better filtering
const { data: payroll } = await supabase
  .from('payroll_line_items')
  .select(`
    *,
    workers!inner(display_name),
    clients(name)
  `)
  .eq('worker_id', workerId)
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: false });
```

---

## 📊 Data Migration Strategy

### **Phase 1: Schema Creation**
1. Create all tables with proper constraints
2. Set up RLS policies  
3. Create indexes for performance
4. Add sample data for testing

### **Phase 2: Data Export from Google Sheets**
```javascript
// Export script to run in Google Apps Script
function exportToSupabase() {
  const sheets = ['Workers', 'ClockIn', 'TimeEditRequests', 'W9_Records'];
  
  sheets.forEach(sheetName => {
    const data = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(sheetName)
      .getDataRange()
      .getValues();
      
    // Transform and send to Supabase
    const transformedData = transformData(sheetName, data);
    sendToSupabase(sheetName, transformedData);
  });
}
```

### **Phase 3: Data Validation**
- Compare record counts between systems
- Validate data integrity (foreign keys, constraints)
- Test critical workflows with migrated data
- Verify user authentication works

### **Phase 4: Incremental Sync (During Testing)**
- Set up sync process to keep both systems in sync during parallel testing
- Use timestamps to identify new/modified records  
- Automated sync every 15 minutes during testing period

---

## 🚀 Deployment Configuration

### **Vercel Setup**
```javascript
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### **Environment Variables**
```bash
# .env.local (development)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENVIRONMENT=development

# Vercel Environment Variables (production)
VITE_SUPABASE_URL=https://your-project.supabase.co  
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENVIRONMENT=production
```

### **Custom Domain Configuration**
1. Configure `portal.carolinalumpers.com` in Vercel
2. Update DNS records to point to Vercel
3. Automatic SSL certificate provisioning
4. Test custom domain functionality

---

## 🧪 Testing Strategy

### **Unit Tests** (Critical APIs)
```javascript
// Test clock-in functionality
describe('Clock-in API', () => {
  test('should create clock-in record', async () => {
    const { data, error } = await supabase
      .from('clock_ins')
      .insert({
        worker_id: 'TEST001',
        date: '2025-11-13',
        time: '08:00:00', 
        latitude: 35.7796,
        longitude: -78.6382
      });
      
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

### **Integration Tests**
- End-to-end user workflows (login → clock-in → view reports)
- Admin approval workflows (time edits, W-9s)
- Real-time updates functionality
- Mobile browser compatibility

### **Performance Tests**
- API response time benchmarks (target: <200ms)
- Load testing with simulated 50 concurrent users  
- Database query optimization
- Real-time subscription performance

### **Data Integrity Tests**
- Foreign key constraints validation
- RLS policy enforcement testing
- Data migration accuracy verification
- Backup and restore procedures

---

## 📈 Success Metrics

### **Performance Improvements**
- **API Response Time:** 2-5s → <200ms (10x improvement)
- **Real-time Updates:** Manual refresh → Instant updates
- **Scalability:** 15 users → 500+ users (free tier limit)
- **Reliability:** 99.5% → 99.9% uptime (Supabase SLA)

### **Cost Efficiency**  
- **Current Cost:** $0/month (Google free tiers)
- **New Cost:** $0/month (Supabase + Vercel free tiers)
- **Scale Cost:** $45/month only when exceeding free limits (100+ employees)
- **ROI:** Infinite (same cost, 10x performance)

### **User Experience**
- **Loading Time:** 3-5s → <1s page loads
- **Offline Support:** None → PWA offline capabilities  
- **Real-time Features:** None → Live admin dashboard
- **Mobile Experience:** Basic → Optimized PWA

### **Developer Experience**
- **Deployment:** Manual → Automated (git push)
- **Database Management:** Spreadsheet → Professional SQL
- **API Development:** Custom scripting → Auto-generated APIs
- **Monitoring:** Basic logging → Advanced analytics

---

## 🔒 Risk Management

### **Technical Risks**
- **Data Migration Issues:** Mitigated by parallel systems and validation
- **Performance Problems:** Addressed by thorough testing and monitoring
- **Authentication Failures:** Rollback plan to Google system available
- **Browser Compatibility:** Cross-browser testing in plan

### **Business Risks**
- **Employee Downtime:** Zero-downtime migration strategy
- **Data Loss:** Parallel systems prevent data loss
- **Training Required:** UI remains similar, minimal training needed
- **Cost Overruns:** Free tiers provide cost certainty

### **Rollback Procedures**
1. **Immediate Rollback:** Change API endpoint in React Portal (5 minutes)
2. **Data Rollback:** Export from Supabase, import to Google Sheets
3. **Domain Rollback:** Switch DNS back to Google Cloud Storage
4. **Communication:** Pre-written employee notifications ready

---

## ✅ Go-Live Checklist

### **Pre-Migration** 
- [ ] Supabase project configured and tested
- [ ] All APIs migrated and validated  
- [ ] Data migration completed and verified
- [ ] Vercel deployment tested
- [ ] Custom domain configured
- [ ] Employee communication prepared

### **Migration Day**
- [ ] Final data sync from Google Sheets
- [ ] Switch React Portal to Supabase APIs
- [ ] Deploy to Vercel production
- [ ] Update DNS to point to Vercel
- [ ] Test critical workflows
- [ ] Notify employees of switch
- [ ] Monitor for issues

### **Post-Migration**
- [ ] Monitor API performance (first 24 hours)
- [ ] Validate all employee workflows  
- [ ] Check real-time features working
- [ ] Verify admin functions operational
- [ ] Document any issues and resolutions
- [ ] Schedule Google system decommissioning

---

**Migration Lead:** Steve Garay  
**Target Start Date:** Week of November 18, 2025  
**Target Completion:** December 9, 2025  
**Success Criteria:** 10x performance improvement, $0 cost increase, zero employee downtime