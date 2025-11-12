# Carolina Lumpers Employee Portal - Project Structure

This repository contains **two versions** of the employee portal running side-by-side during the migration to React.

## Repository Structure

```
carolina-lumpers-web/
├── react-portal/              # 🆕 NEW: React-based portal (Phase 0 complete)
│   ├── src/                   # React source code
│   ├── public/                # Static assets
│   ├── dist/                  # Production build (gitignored)
│   └── package.json           # React dependencies
│
├── GoogleAppsScripts/         # Backend (unchanged)
│   ├── EmployeeLogin/         # Main API
│   ├── LoggingLibrary/        # Centralized logging
│   └── [other projects]/     # Payroll, Invoice, etc.
│
├── *.html                     # 📦 OLD: Current HTML pages
├── css/                       # 📦 OLD: Current stylesheets
├── js/                        # 📦 OLD: Current JavaScript
├── assets/                    # Shared assets (used by both)
└── package.json               # Root project (Tailwind for old site)
```

## Two Portals Comparison

### 📦 Current HTML Portal (Old)
- **Location:** Root directory (`employeelogin.html`, `employeeDashboard.html`, etc.)
- **Tech Stack:** Vanilla HTML/CSS/JS + Tailwind
- **Dev Server:** `npm run dev` → http://localhost:8010
- **Status:** ✅ Production (live on carolinalumpers.com)
- **Maintenance:** Critical bugs only

### 🆕 React Portal (New)
- **Location:** `react-portal/` directory
- **Tech Stack:** React 18 + Vite + Tailwind + i18next
- **Dev Server:** `cd react-portal && npm run dev` → http://localhost:5173
- **Status:** 🚧 Development (Phase 0 complete)
- **Deployment:** Not yet deployed

## Development Workflow

### Working on OLD Site (HTML)
```powershell
# From root directory
npm run dev              # Start Python server on :8010
# Edit: *.html, css/*, js/*
```

### Working on NEW Site (React)
```powershell
# From root directory
cd react-portal
npm run dev              # Start Vite server on :5173
# Edit: src/**/*.jsx
```

### Backend Development (Google Apps Script)
```powershell
# From root directory
cd GoogleAppsScripts/EmployeeLogin
clasp push               # Deploy to Google Apps Script
```

## Migration Strategy

### ✅ Phase 0: Foundation (Complete)
- React project setup
- API integration
- Auth system
- Basic Login/Signup/Dashboard
- Multilingual support

### 🔄 Phase 1: Dashboard Core (Next)
- Clock-in functionality
- Time entries table
- Payroll view
- W-9 status integration

### 📅 Future Phases
- Phase 2: Admin features
- Phase 3: PWA & offline sync
- Phase 4: Production deployment
- Phase 5: Retire old HTML site

## Running Both Sites Simultaneously

You can run BOTH sites at the same time for comparison:

```powershell
# Terminal 1: Old HTML site
npm run dev                    # → http://localhost:8010

# Terminal 2: New React site
cd react-portal
npm run dev                    # → http://localhost:5173
```

Both connect to the **same backend** (Google Apps Script), so data is shared.

## Git Strategy

### Recommended: **Keep in Same Repo** ✅

**Pros:**
- Shared assets (logos, icons)
- Same backend integration
- Easy cross-reference
- Simpler CI/CD
- Single source of truth

**Commit Strategy:**
```powershell
# HTML changes (old site)
git add employeeDashboard.html css/ js/
git commit -m "fix: W-9 blocking bug"

# React changes (new site)
git add react-portal/
git commit -m "feat(react): add clock-in functionality"

# Backend changes
git add GoogleAppsScripts/
git commit -m "feat(backend): add new API endpoint"
```

### Alternative: Separate Repo (Not Recommended)

Only consider if:
- React app becomes completely independent
- Need different deployment pipelines
- Want to open-source React code separately

## Deployment

### Current (Old Site)
- **Hosting:** Google Cloud Storage (static)
- **URL:** https://carolinalumpers.com
- **Deploy:** Upload HTML/CSS/JS files
- **CDN:** Cloudflare (proxy)

### Future (React Site)
- **Build:** `npm run build` in react-portal/
- **Output:** react-portal/dist/ (optimized HTML/CSS/JS)
- **Deploy:** Same as current (upload dist/ contents)
- **URL:** Will replace carolinalumpers.com

## Dependencies

### Root package.json (Old Site)
- Tailwind CSS (for HTML pages)
- Python http.server (dev only)

### react-portal/package.json (New Site)
- React 18
- Vite (build tool)
- React Router
- TanStack Query
- i18next
- Zustand
- Tailwind CSS
- PWA plugin

## Backend (No Changes Required)

Both old and new sites use the **same backend**:
- **API:** https://cls-proxy.s-garay.workers.dev
- **Backend:** Google Apps Script (EmployeeLogin project)
- **Database:** Google Sheets (CLS_Hub_Backend)

No backend code changes needed for React migration!

## Key Files

### Configuration
- `Workspace_AppsScriptEmployeeLogin.code-workspace` - Multi-folder workspace
- `.gitignore` - Git ignore rules (updated for React)
- `MODERNIZATION_PLAN.md` - Full migration strategy
- `react-portal/SETUP.md` - React setup instructions

### Documentation
- `README.md` - Main project docs (this file)
- `react-portal/README.md` - React app docs
- `.github/copilot-instructions.md` - AI coding guidelines
- `.github/DATABASE_SCHEMA.md` - Backend database structure

## Quick Start

### First Time Setup

```powershell
# Install root dependencies (for old site)
npm install

# Install React dependencies
cd react-portal
npm install
cd ..
```

### Daily Development

```powershell
# Option 1: Work on old site
npm run dev

# Option 2: Work on React site
cd react-portal
npm run dev
```

## FAQ

**Q: Why keep both sites?**  
A: Gradual migration. Old site stays live while we build/test new site.

**Q: Do I need to update both sites?**  
A: For now, critical fixes go to old site. New features go to React site only.

**Q: When will we switch to React?**  
A: After Phase 3 (PWA/offline) is complete and tested (~6-8 weeks).

**Q: Can I delete the old HTML files?**  
A: Not yet! Wait until React site is fully deployed and stable.

**Q: Same repo or separate?**  
A: **Same repo** (carolina-lumpers-web). Easier to manage during migration.

**Q: How do I know which site I'm looking at?**  
A: Check the URL:
- `localhost:8010` = Old HTML site
- `localhost:5173` = New React site

## Support

- **Documentation:** See MODERNIZATION_PLAN.md for full migration plan
- **React Setup:** See react-portal/SETUP.md for React-specific instructions
- **Backend:** See GoogleAppsScripts/EmployeeLogin/README.md for API docs
- **Issues:** Use GitHub Issues for tracking

---

**Status:** Phase 0 complete ✅ | Phase 1 in progress 🚧  
**Last Updated:** November 11, 2025
