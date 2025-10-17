# Recruiting to Hiring Pipeline Module

**Last Updated**: October 17, 2025  
**Purpose**: Complete talent acquisition system from sourcing to onboarding

---

## 🎯 Pipeline Overview

```
[Job Posting] → [Applications] → [Screening] → [Interview] → [Offer] → [Onboarding] → [Active Worker]
```

---

## 📊 Complete Database Schema

### 1. Job Postings & Requisitions

```sql
-- Job postings that attract candidates
job_postings (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  
  -- Requisition details
  title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'temporary', 'contract')),
  shift_type TEXT CHECK (shift_type IN ('morning', 'afternoon', 'night', 'rotating', 'flexible')),
  
  -- Job details
  description TEXT NOT NULL,
  responsibilities TEXT[],
  requirements TEXT[],
  preferred_qualifications TEXT[],
  
  -- Compensation
  pay_rate_min NUMERIC(10, 2),
  pay_rate_max NUMERIC(10, 2),
  pay_type TEXT CHECK (pay_type IN ('hourly', 'salary', 'per_job')),
  benefits TEXT[],
  
  -- Location
  work_location_type TEXT CHECK (work_location_type IN ('on_site', 'remote', 'hybrid')),
  site_ids UUID[] REFERENCES sites(id)[],
  travel_required BOOLEAN DEFAULT FALSE,
  
  -- Posting status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'filled')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  
  -- Tracking
  openings_count INTEGER DEFAULT 1,
  filled_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  
  -- SEO & Marketing
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  share_url TEXT GENERATED ALWAYS AS (
    'https://carolinalumpers.com/jobs/' || id
  ) STORED,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for public job board
CREATE INDEX idx_job_postings_active ON job_postings(status, published_at DESC)
WHERE status = 'active' AND expires_at > NOW();
```

### 2. Enhanced Application System

```sql
-- Complete applicant profile
applicants (
  id UUID PRIMARY KEY,
  
  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  dob DATE,
  
  -- Address
  street_address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  
  -- Work authorization
  work_authorization TEXT CHECK (work_authorization IN (
    'us_citizen', 'permanent_resident', 'work_visa', 'refugee', 'other'
  )),
  work_auth_document_url TEXT,
  ssn_encrypted TEXT, -- Encrypted SSN for I-9
  
  -- Transportation
  has_reliable_transportation BOOLEAN,
  has_drivers_license BOOLEAN,
  drivers_license_state TEXT,
  drivers_license_number_encrypted TEXT,
  
  -- Availability
  available_start_date DATE,
  shift_preferences TEXT[],
  max_commute_miles NUMERIC(5, 2),
  
  -- Language
  primary_language TEXT DEFAULT 'english',
  english_proficiency TEXT CHECK (english_proficiency IN ('basic', 'intermediate', 'fluent', 'native')),
  other_languages TEXT[],
  
  -- Experience
  years_experience NUMERIC(4, 1),
  has_warehouse_experience BOOLEAN,
  has_forklift_certification BOOLEAN,
  certifications TEXT[],
  
  -- Documents
  resume_url TEXT,
  cover_letter_url TEXT,
  references_url TEXT,
  
  -- Source tracking
  referral_source TEXT,
  referrer_worker_id UUID REFERENCES workers(id),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Overall status
  overall_status TEXT DEFAULT 'new' CHECK (overall_status IN (
    'new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn', 'archived'
  )),
  
  -- Tags for filtering
  tags TEXT[],
  
  -- Privacy
  gdpr_consent BOOLEAN DEFAULT FALSE,
  can_contact BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications (one applicant can apply to multiple jobs)
applications (
  id UUID PRIMARY KEY,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  
  -- Application details
  application_status TEXT DEFAULT 'submitted' CHECK (application_status IN (
    'submitted', 'reviewing', 'shortlisted', 'interviewing', 
    'offer_pending', 'offer_sent', 'offer_accepted', 'offer_declined',
    'hired', 'rejected', 'withdrawn'
  )),
  
  -- Cover letter specific to this job
  custom_cover_letter TEXT,
  
  -- Screening questions (job-specific)
  screening_answers JSONB,
  
  -- Score & Rating
  automated_score INTEGER, -- 0-100 from keyword matching
  recruiter_rating INTEGER CHECK (recruiter_rating BETWEEN 1 AND 5),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  UNIQUE(applicant_id, job_posting_id)
);

-- Application status history (audit trail)
application_status_history (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  reason_code TEXT,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Screening & Assessment

```sql
-- Screening questionnaires
screening_templates (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  questions JSONB NOT NULL,
  passing_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example questions structure:
-- {
--   "questions": [
--     {
--       "id": "q1",
--       "type": "yes_no",
--       "text": "Are you able to lift 50+ lbs?",
--       "required": true,
--       "disqualify_if": "no"
--     },
--     {
--       "id": "q2",
--       "type": "multiple_choice",
--       "text": "Years of warehouse experience?",
--       "options": ["0-1", "1-3", "3-5", "5+"],
--       "points": [1, 2, 3, 5]
--     }
--   ]
-- }

-- Screening results
screening_results (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  template_id UUID REFERENCES screening_templates(id),
  answers JSONB NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Interview Management

```sql
-- Interview stages (phone, in-person, etc.)
interview_stages (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL,
  duration_minutes INTEGER,
  interview_type TEXT CHECK (interview_type IN ('phone', 'video', 'in_person', 'group')),
  is_required BOOLEAN DEFAULT TRUE,
  evaluation_template_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled interviews
interviews (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES interview_stages(id),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT,
  meeting_link TEXT, -- Zoom, Google Meet, etc.
  
  -- Participants
  interviewer_id UUID REFERENCES users(id),
  additional_interviewers UUID[] REFERENCES users(id)[],
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
  )),
  
  -- Outcome
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation TEXT CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
  notes TEXT,
  evaluation_data JSONB,
  
  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview evaluation criteria
evaluation_criteria (
  id UUID PRIMARY KEY,
  stage_id UUID REFERENCES interview_stages(id),
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(3, 2) DEFAULT 1.0,
  order_number INTEGER
);

-- Individual criterion scores
interview_scores (
  id UUID PRIMARY KEY,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES evaluation_criteria(id),
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  notes TEXT
);
```

### 5. Background Checks & References

```sql
-- Reference checks
reference_checks (
  id UUID PRIMARY KEY,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  
  -- Reference contact info
  reference_name TEXT NOT NULL,
  reference_relationship TEXT,
  reference_company TEXT,
  reference_phone TEXT,
  reference_email TEXT,
  
  -- Check details
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  
  -- Results
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  would_rehire BOOLEAN,
  notes TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'unreachable'))
);

-- Background checks (integration with service like Checkr)
background_checks (
  id UUID PRIMARY KEY,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  
  -- Check details
  check_type TEXT CHECK (check_type IN ('criminal', 'employment', 'education', 'drug_test', 'driving_record')),
  provider TEXT, -- Checkr, Sterling, etc.
  provider_check_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed')),
  result TEXT CHECK (result IN ('clear', 'consider', 'fail', 'pending')),
  
  -- Details
  report_url TEXT,
  notes TEXT,
  
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);
```

### 6. Offer Management

```sql
-- Job offers
offers (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Offer details
  position_title TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  
  -- Compensation
  pay_rate NUMERIC(10, 2) NOT NULL,
  pay_type TEXT NOT NULL,
  bonus_amount NUMERIC(10, 2),
  benefits_summary TEXT,
  
  -- Work details
  shift_type TEXT,
  expected_hours_per_week NUMERIC(4, 1),
  site_id UUID REFERENCES sites(id),
  
  -- Offer lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'sent', 
    'accepted', 'declined', 'expired', 'withdrawn'
  )),
  
  -- Document
  offer_letter_url TEXT,
  
  -- Dates
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  
  -- Signatures
  signed_by_company UUID REFERENCES users(id),
  signed_by_applicant BOOLEAN DEFAULT FALSE,
  applicant_signature_url TEXT,
  applicant_signed_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offer approval workflow
offer_approvals (
  id UUID PRIMARY KEY,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. Onboarding Workflow

```sql
-- Onboarding checklists
onboarding_templates (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  tasks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example tasks structure:
-- {
--   "tasks": [
--     {
--       "id": "task1",
--       "title": "Complete I-9 Form",
--       "description": "Bring two forms of ID",
--       "required": true,
--       "assigned_to": "hr",
--       "due_days": 1,
--       "category": "paperwork"
--     },
--     {
--       "id": "task2",
--       "title": "Safety Training Video",
--       "description": "30-minute OSHA safety video",
--       "required": true,
--       "assigned_to": "worker",
--       "due_days": 3,
--       "category": "training"
--     }
--   ]
-- }

-- Onboarding instances
onboarding_instances (
  id UUID PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES onboarding_templates(id),
  
  start_date DATE NOT NULL,
  target_completion_date DATE,
  actual_completion_date DATE,
  
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'completed', 'paused'
  )),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual task completion
onboarding_tasks (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES onboarding_instances(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL, -- matches task.id from template
  
  -- Assignment
  assigned_to TEXT, -- 'worker', 'hr', 'supervisor'
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  
  -- Documents
  document_url TEXT,
  
  -- Completion
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Automated Workflows

### 1. Application Scoring (PostgreSQL Function)

```sql
CREATE OR REPLACE FUNCTION calculate_application_score(p_application_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_applicant RECORD;
  v_job RECORD;
BEGIN
  -- Get applicant and job details
  SELECT a.*, ap.*
  INTO v_applicant
  FROM applications app
  JOIN applicants a ON a.id = app.applicant_id
  WHERE app.id = p_application_id;
  
  SELECT * INTO v_job FROM job_postings jp
  JOIN applications app ON app.job_posting_id = jp.id
  WHERE app.id = p_application_id;
  
  -- Score components:
  
  -- Experience match (0-25 points)
  IF v_applicant.has_warehouse_experience THEN
    v_score := v_score + 15;
  END IF;
  
  IF v_applicant.years_experience >= 2 THEN
    v_score := v_score + 10;
  END IF;
  
  -- Work authorization (0-20 points)
  IF v_applicant.work_authorization IN ('us_citizen', 'permanent_resident') THEN
    v_score := v_score + 20;
  ELSIF v_applicant.work_authorization = 'work_visa' THEN
    v_score := v_score + 10;
  END IF;
  
  -- Transportation (0-15 points)
  IF v_applicant.has_reliable_transportation THEN
    v_score := v_score + 10;
  END IF;
  
  IF v_applicant.has_drivers_license THEN
    v_score := v_score + 5;
  END IF;
  
  -- Availability (0-15 points)
  IF v_applicant.available_start_date <= CURRENT_DATE + INTERVAL '7 days' THEN
    v_score := v_score + 15;
  ELSIF v_applicant.available_start_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    v_score := v_score + 10;
  END IF;
  
  -- Certifications (0-15 points)
  IF v_applicant.has_forklift_certification THEN
    v_score := v_score + 15;
  END IF;
  
  -- Resume provided (0-10 points)
  IF v_applicant.resume_url IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- Cap at 100
  v_score := LEAST(v_score, 100);
  
  -- Update application
  UPDATE applications
  SET automated_score = v_score
  WHERE id = p_application_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Calculate score on application submission
CREATE TRIGGER calculate_score_on_submit
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION calculate_application_score(NEW.id);
```

### 2. Automatic Status Updates

```sql
-- Function: Update application status based on interview results
CREATE OR REPLACE FUNCTION update_status_from_interview()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.recommendation IN ('strong_yes', 'yes') THEN
    -- Move to next stage or offer
    UPDATE applications
    SET application_status = 'offer_pending'
    WHERE id = NEW.application_id;
  ELSIF NEW.status = 'completed' AND NEW.recommendation IN ('no', 'strong_no') THEN
    -- Reject application
    UPDATE applications
    SET application_status = 'rejected',
        rejected_at = NOW()
    WHERE id = NEW.application_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_status_update
  AFTER UPDATE ON interviews
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_status_from_interview();
```

### 3. Email Notifications (Edge Function)

```typescript
// supabase/functions/recruiting-notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

const EMAIL_TEMPLATES = {
  application_received: {
    subject: 'Application Received - Carolina Lumpers Service',
    html: (data: any) => `
      <h2>Thank you for applying, ${data.first_name}!</h2>
      <p>We've received your application for <strong>${data.job_title}</strong>.</p>
      <p>Next steps:</p>
      <ul>
        <li>Our team will review your application within 48 hours</li>
        <li>If selected, we'll contact you to schedule an interview</li>
      </ul>
      <p>Application ID: ${data.application_id}</p>
    `
  },
  
  interview_scheduled: {
    subject: 'Interview Scheduled - Carolina Lumpers Service',
    html: (data: any) => `
      <h2>Your interview is scheduled!</h2>
      <p><strong>Date:</strong> ${data.scheduled_at}</p>
      <p><strong>Duration:</strong> ${data.duration_minutes} minutes</p>
      <p><strong>Location:</strong> ${data.location}</p>
      ${data.meeting_link ? `<p><a href="${data.meeting_link}">Join Video Call</a></p>` : ''}
      <p>Add to calendar: <a href="${data.calendar_link}">iCal</a></p>
    `
  },
  
  offer_sent: {
    subject: 'Job Offer - Carolina Lumpers Service',
    html: (data: any) => `
      <h2>Congratulations, ${data.first_name}!</h2>
      <p>We're excited to offer you the position of <strong>${data.position_title}</strong>.</p>
      <p><strong>Start Date:</strong> ${data.start_date}</p>
      <p><strong>Pay Rate:</strong> $${data.pay_rate}/${data.pay_type}</p>
      <p>Please review and sign your offer letter: <a href="${data.offer_link}">View Offer</a></p>
      <p>This offer expires on ${data.expires_at}.</p>
    `
  },
  
  rejection: {
    subject: 'Application Update - Carolina Lumpers Service',
    html: (data: any) => `
      <h2>Thank you for your interest, ${data.first_name}</h2>
      <p>After careful consideration, we've decided to move forward with other candidates for the <strong>${data.job_title}</strong> position.</p>
      <p>We encourage you to apply for future openings that match your qualifications.</p>
      <p><a href="https://carolinalumpers.com/jobs">View Open Positions</a></p>
    `
  }
}

serve(async (req) => {
  const { type, data } = await req.json()
  
  const template = EMAIL_TEMPLATES[type]
  if (!template) {
    return new Response(JSON.stringify({ error: 'Unknown template' }), { status: 400 })
  }
  
  // Send via SendGrid
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: { email: 'recruiting@carolinalumpers.com', name: 'Carolina Lumpers Service' },
      to: [{ email: data.email }],
      subject: template.subject,
      html: template.html(data)
    })
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

---

## 🎨 React UI Components

### 1. Applicant Tracking Dashboard

```typescript
// src/features/recruiting/ApplicantDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function ApplicantDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['recruiting-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_recruiting_stats')
      return data
    }
  })
  
  const { data: applications } = useQuery({
    queryKey: ['recent-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          applicants(*),
          job_postings(title)
        `)
        .order('submitted_at', { ascending: false })
        .limit(20)
      return data
    }
  })
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>New Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.new_count}</div>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>In Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.interviewing_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Offers Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.offer_pending_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Hired (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.hired_ytd}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Application Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications?.map(app => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {app.applicants.first_name} {app.applicants.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {app.applicants.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{app.job_postings.title}</TableCell>
                  <TableCell>
                    <Badge variant={app.automated_score >= 70 ? 'success' : 'secondary'}>
                      {app.automated_score}/100
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{app.application_status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(app.submitted_at)}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => viewApplicant(app.applicant_id)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 2. Kanban Pipeline View

```typescript
// src/features/recruiting/PipelineBoard.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'

const PIPELINE_STAGES = [
  { id: 'submitted', label: 'New', color: 'blue' },
  { id: 'screening', label: 'Screening', color: 'yellow' },
  { id: 'interviewing', label: 'Interview', color: 'purple' },
  { id: 'offer_pending', label: 'Offer', color: 'green' },
  { id: 'hired', label: 'Hired', color: 'emerald' }
]

export function PipelineBoard() {
  const { data: applications } = useQuery({
    queryKey: ['pipeline-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, applicants(*), job_postings(title)')
        .in('application_status', PIPELINE_STAGES.map(s => s.id))
      return data
    }
  })
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    // Update application status
    await supabase
      .from('applications')
      .update({ application_status: over.id })
      .eq('id', active.id)
  }
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-5 gap-4 h-screen">
        {PIPELINE_STAGES.map(stage => {
          const stageApplications = applications?.filter(
            app => app.application_status === stage.id
          )
          
          return (
            <div key={stage.id} className="flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{stage.label}</h3>
                <Badge variant="secondary">{stageApplications?.length || 0}</Badge>
              </div>
              
              <div className="flex-1 space-y-2 overflow-y-auto">
                {stageApplications?.map(app => (
                  <ApplicantCard key={app.id} application={app} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}
```

### 3. Interview Scheduler

```typescript
// src/features/recruiting/InterviewScheduler.tsx
import { Calendar } from '@/components/ui/calendar'
import { TimePicker } from '@/components/ui/time-picker'

export function InterviewScheduler({ applicationId }: { applicationId: string }) {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>()
  
  const { data: interviewers } = useQuery({
    queryKey: ['available-interviewers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'supervisor'])
      return data
    }
  })
  
  const scheduleInterview = async (formData: InterviewForm) => {
    // Create interview
    const { data: interview } = await supabase
      .from('interviews')
      .insert({
        application_id: applicationId,
        scheduled_at: `${date} ${time}`,
        duration_minutes: formData.duration,
        interviewer_id: formData.interviewer,
        location: formData.location,
        meeting_link: formData.meetingLink
      })
      .select()
      .single()
    
    // Send notifications
    await supabase.functions.invoke('recruiting-notifications', {
      body: {
        type: 'interview_scheduled',
        data: {
          email: applicant.email,
          scheduled_at: formatDateTime(interview.scheduled_at),
          duration_minutes: interview.duration_minutes,
          location: interview.location,
          meeting_link: interview.meeting_link
        }
      }
    })
    
    // Update application status
    await supabase
      .from('applications')
      .update({ application_status: 'interviewing' })
      .eq('id', applicationId)
  }
  
  return (
    <Form onSubmit={scheduleInterview}>
      <Calendar mode="single" selected={date} onSelect={setDate} />
      <TimePicker value={time} onChange={setTime} />
      <Select name="interviewer" options={interviewers} />
      <Input name="duration" type="number" defaultValue={30} />
      <Input name="location" placeholder="Office or video call" />
      <Input name="meetingLink" placeholder="https://zoom.us/..." />
      <Button type="submit">Schedule Interview</Button>
    </Form>
  )
}
```

---

## 📊 Reports & Analytics

### SQL Views for Reporting

```sql
-- Recruiting funnel metrics
CREATE VIEW recruiting_funnel AS
SELECT 
  jp.id AS job_posting_id,
  jp.title AS job_title,
  COUNT(DISTINCT a.id) AS total_applications,
  COUNT(DISTINCT CASE WHEN a.application_status = 'reviewing' THEN a.id END) AS in_review,
  COUNT(DISTINCT CASE WHEN a.application_status = 'shortlisted' THEN a.id END) AS shortlisted,
  COUNT(DISTINCT i.id) AS total_interviews,
  COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) AS completed_interviews,
  COUNT(DISTINCT o.id) AS offers_sent,
  COUNT(DISTINCT CASE WHEN o.status = 'accepted' THEN o.id END) AS offers_accepted,
  COUNT(DISTINCT CASE WHEN a.application_status = 'hired' THEN a.id END) AS hires,
  
  -- Conversion rates
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN a.application_status = 'hired' THEN a.id END) / 
    NULLIF(COUNT(DISTINCT a.id), 0), 
    2
  ) AS application_to_hire_rate
FROM job_postings jp
LEFT JOIN applications a ON a.job_posting_id = jp.id
LEFT JOIN interviews i ON i.application_id = a.id
LEFT JOIN offers o ON o.application_id = a.id
WHERE jp.status = 'active'
GROUP BY jp.id;

-- Time-to-hire metrics
CREATE VIEW time_to_hire AS
SELECT 
  a.id AS application_id,
  ap.first_name || ' ' || ap.last_name AS applicant_name,
  jp.title AS job_title,
  a.submitted_at,
  o.accepted_at AS offer_accepted_at,
  EXTRACT(DAY FROM (o.accepted_at - a.submitted_at)) AS days_to_hire,
  
  -- Stage durations
  EXTRACT(DAY FROM (a.reviewed_at - a.submitted_at)) AS days_in_submitted,
  EXTRACT(DAY FROM (
    (SELECT MIN(scheduled_at) FROM interviews WHERE application_id = a.id) - 
    a.reviewed_at
  )) AS days_to_first_interview,
  EXTRACT(DAY FROM (
    o.sent_at - 
    (SELECT MAX(completed_at) FROM interviews WHERE application_id = a.id)
  )) AS days_interview_to_offer
FROM applications a
JOIN applicants ap ON ap.id = a.applicant_id
JOIN job_postings jp ON jp.id = a.job_posting_id
JOIN offers o ON o.application_id = a.id AND o.status = 'accepted'
WHERE a.application_status = 'hired';

-- Source effectiveness
CREATE VIEW source_effectiveness AS
SELECT 
  COALESCE(ap.referral_source, 'Direct') AS source,
  COUNT(*) AS total_applications,
  COUNT(CASE WHEN a.application_status = 'hired' THEN 1 END) AS hires,
  ROUND(
    100.0 * COUNT(CASE WHEN a.application_status = 'hired' THEN 1 END) / 
    COUNT(*), 
    2
  ) AS conversion_rate,
  ROUND(AVG(a.automated_score), 1) AS avg_quality_score
FROM applicants ap
JOIN applications a ON a.applicant_id = ap.id
GROUP BY ap.referral_source
ORDER BY hires DESC;
```

---

## 🔗 Integration Points

### 1. Job Board Posting APIs

```typescript
// Post to Indeed, ZipRecruiter, LinkedIn, etc.
// supabase/functions/post-job-boards/index.ts

const JOB_BOARDS = {
  indeed: {
    endpoint: 'https://api.indeed.com/v1/jobs',
    apiKey: Deno.env.get('INDEED_API_KEY')
  },
  ziprecruiter: {
    endpoint: 'https://api.ziprecruiter.com/v1/jobs',
    apiKey: Deno.env.get('ZIPRECRUITER_API_KEY')
  }
}

serve(async (req) => {
  const { job_posting_id } = await req.json()
  
  const { data: job } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', job_posting_id)
    .single()
  
  // Post to each board
  for (const [board, config] of Object.entries(JOB_BOARDS)) {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: job.title,
        description: job.description,
        location: job.site_ids[0], // geocode this
        salary_min: job.pay_rate_min,
        salary_max: job.pay_rate_max,
        apply_url: job.share_url
      })
    })
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

### 2. Background Check Integration (Checkr)

```typescript
// supabase/functions/request-background-check/index.ts

serve(async (req) => {
  const { applicant_id, check_types } = await req.json()
  
  const { data: applicant } = await supabase
    .from('applicants')
    .select('*')
    .eq('id', applicant_id)
    .single()
  
  // Create candidate in Checkr
  const candidate = await fetch('https://api.checkr.com/v1/candidates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CHECKR_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      first_name: applicant.first_name,
      last_name: applicant.last_name,
      email: applicant.email,
      dob: applicant.dob,
      ssn: decrypt(applicant.ssn_encrypted)
    })
  }).then(r => r.json())
  
  // Request reports
  for (const checkType of check_types) {
    const report = await fetch('https://api.checkr.com/v1/reports', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('CHECKR_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        package: checkType
      })
    }).then(r => r.json())
    
    // Store in database
    await supabase.from('background_checks').insert({
      applicant_id,
      check_type: checkType,
      provider: 'checkr',
      provider_check_id: report.id,
      status: 'pending'
    })
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

---

## 🎯 Key Features Summary

### ✅ **Complete Talent Pipeline**
- Job posting management
- Multi-channel application intake
- Automated scoring & ranking
- Interview scheduling & tracking
- Offer management
- Onboarding workflows

### ✅ **Automation**
- Auto-score applications
- Email notifications (every stage)
- Status transitions (based on actions)
- Background checks (API integration)
- Calendar invites
- Reminder emails

### ✅ **Analytics**
- Recruiting funnel
- Time-to-hire metrics
- Source effectiveness
- Interviewer performance
- Cost-per-hire

### ✅ **Compliance**
- EEOC tracking
- I-9 management
- Background checks
- Document storage
- Audit trails

---

## 🚀 Implementation Timeline

**Week 1-2**: Database schema + core CRUD
**Week 3**: Application intake + scoring
**Week 4**: Interview scheduling + tracking
**Week 5**: Offer management
**Week 6**: Onboarding workflows
**Week 7**: Integrations (job boards, Checkr)
**Week 8**: Analytics + reporting

---

Ready to build your recruiting powerhouse? This system will transform how you find and hire top talent! 🎯

Which component should we start with?
- Job posting system
- Application tracking
- Interview management
- Offer workflow
