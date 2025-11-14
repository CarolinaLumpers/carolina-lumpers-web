# Unified Technology Stack Documentation (Startup Strategy)
**Vercel + Supabase – Fast, Simple, Low Cost**

## Overview

All systems in the portfolio use a unified architecture centered around:

* **Vercel** for frontend hosting, global CDN, preview deploys, and edge functions
* **Supabase** for backend, database, authentication, storage, and business logic
* **React** for modern application interfaces

This setup provides the fastest development speed, lowest cost, and clean system structure suited for small teams, internal business tools, and early-stage commercial applications.

---

## Core Stack Components

### 1. Frontend

**Technology:** React 18 + Vite  
**Hosting:** Vercel (Free Tier → Pro Tier as needed)  
**Domains:** Route53 or Cloudflare  
**Routing:** React Router  
**State:** Zustand + React Query  

#### Responsibilities

* User interface and UX
* Form submission
* API integration
* Authentication with Supabase
* Local caching and state sync
* Mobile responsiveness

#### Benefits

* Free global CDN
* Zero-config deployments
* Automatic HTTPS
* Preview deployments for every branch
* Simple environment variable management
* **Starting cost:** $0/month
* **Scale cost:** $20/month only if needed

---

### 2. Backend

**Primary Platform:** Supabase  
**Database:** PostgreSQL  
**Auth:** Supabase Auth (JWT-based)  
**Edge Functions:** Deno-based serverless APIs  
**Storage:** Supabase Storage (Files, images, PDFs)  
**Scheduled Jobs:** Supabase Cron  

#### Responsibilities

* User authentication and session management
* Secure database access
* CRUD operations for each system (CLS, HouseReno, Kredit-Ya)
* Business logic inside Edge Functions
* Row-level security enforcement
* File uploads and access control

#### Benefits

* Free tier is powerful
* Minimal backend coding required
* Built-in APIs for every table
* Role-based access using SQL
* Highly scalable without migrations
* Automatic backups on Pro tier
* **Starting cost:** $0/month
* **Scale cost:** $25/month per system once Pro tier needed

---

### 3. AI Integration

#### Providers

* OpenAI
* Anthropic
* Google Generative AI

#### Responsibilities

* Document extraction
* Summaries and classification
* Loan analysis (Kredit-Ya)
* Permit intake assistance (HouseRenovators)
* Worker verification checks (CLS future feature)

#### Execution Points

AI calls are made from:

* **Supabase Edge Functions** (secure and server-side), or
* **Frontend with RLS protections** (for non-sensitive flows)

---

### 4. Infrastructure

#### Primary Hosting Platform: Vercel

Used for:

* All React frontends
* Static asset optimization
* Serverless API routes (optional)
* Automated deployments

#### Vercel Advantages

* Free hosting for MVPs
* Built-in global CDN
* Preview deploys for testing
* Fast build & deploy workflow
* Works seamlessly with Supabase

**No AWS is required at this stage.**

#### Domains

Domains can be purchased from:

* **AWS Route53** (recommended)
* **Cloudflare** (alternative)

Vercel integrates with either.

#### Subdomains

Each system can have its own subdomain:

* `portal.carolinalumpers.com`
* `ai.houserenovators.com`
* `app.kreditya.com`

---

## Project-Specific Stack Details

### A. Carolina Lumpers Service (CLS)

#### Core Features

* Worker management
* Clock-ins
* Time tracking
* Payroll summaries
* W9 document uploads
* Supervisor admin tools

#### Stack Summary

* **Frontend:** Vercel (React)
* **Backend:** Supabase
* **Database:** SQL tables for workers, logs, payroll data
* **Storage:** Worker photos, W9 docs
* **Auth:** Worker, Supervisor, Admin roles

---

### B. House Renovators AI

#### Core Features

* Permit intake assistant
* Document upload + extraction
* Project data collection
* Intake forms
* Light automation workflows

#### Stack Summary

* **Frontend:** Vercel
* **Backend:** Supabase
* **Storage:** PDFs, images, forms
* **Edge Functions:** AI extraction and workflow logic
* **Auth:** Staff + admin

#### Why Supabase works here

* Workflows are small and manageable
* No need for AWS Step Functions
* File sizes are small
* AI tasks are easy to run in Edge Functions

---

### C. Kredit-Ya

#### Core Features

* Loan management
* Customer records
* Payment tracking
* Due dates and schedules
* Basic financial reports

#### Stack Summary

* **Frontend:** Vercel
* **Backend:** Supabase
* **Storage:** Document uploads (ID scans, proof)
* **Auth:** Admin + employees
* **Database:** SQL tables for loans, payments

---

## DevOps Workflow

### Vercel Deployment

1. Developer pushes to GitHub
2. Vercel builds the React app
3. Automatic preview deploy is created
4. Merge to main triggers production deployment

#### Benefits

* Zero downtime
* No manual steps
* Perfect for rapid development

---

## Security Model

### Supabase

* Row-Level Security (RLS)
* Policies per role
* JWT-based sessions
* File buckets locked to authenticated users

### Frontend

* Access controlled through Supabase session
* No long-lived tokens stored
* All calls scoped to user role

---

## Cost Structure

### Phase 1: Free Tier Start (Recommended)

* **Vercel:** Free
* **Supabase:** Free
* **Domains:** $12/year each
* **Total:** ~$1/month per domain (only domain cost)

### Phase 2: Growth (6–18 months)

Use paid tiers only when needed:

* **Vercel Pro:** $20/month
* **Supabase Pro:** $25/month

Most systems will stay free for months.

### Phase 3: Scale Up (Year 2+)

Optional AWS migration when:

* Traffic exceeds 100GB+
* Complex caching required
* Compliance requirements increase

---

## When to Upgrade

### Vercel Free → Pro ($20/month)

* Need password protection for client access
* Want team collaboration features  
* Need advanced analytics
* Require priority support

### Supabase Free → Pro ($25/month)

* Database approaching 400MB
* API calls approaching 40k/month
* Need daily backups (vs weekly)
* Require priority support

### Migration to AWS

* Traffic exceeding 100GB/month
* Compliance requirements (PCI DSS, etc.)
* Custom caching needs
* Multi-region deployment

---

## Implementation Timeline

### Week 1-2: CLS Migration
* React Portal → Supabase migration
* Deploy to Vercel Free
* Test with existing employees

### Month 1: House Renovators AI MVP
* Next.js project setup
* Basic AI features
* Document processing

### Month 2: Kredit-Ya MVP
* Loan management system
* Basic customer tracking
* Payment workflows

### Month 3-6: Feature Development
* User feedback integration
* Feature expansion based on usage
* Monitor free tier limits

### Month 6+: Selective Upgrades
* Upgrade individual systems based on usage
* Only pay for what you need

---

## Why This Stack Works for Your Business

### ✓ Low cost
You can build and launch all three systems for $0/month.

### ✓ High velocity
Vercel + Supabase eliminates 90% of backend and infrastructure work.

### ✓ Easy to maintain
One stack across all products.

### ✓ Easy to hand off to clients
* Supabase projects can be transferred
* Vercel deployments can be cloned
* Domains can be moved

### ✓ Flexible to grow
Move to AWS later without rewriting everything.

---

**Last Updated:** November 2025  
**Status:** Ready for Implementation  
**First Year Cost Target:** $0-300 vs traditional $2000+ approach