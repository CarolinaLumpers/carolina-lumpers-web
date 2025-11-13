# CLS Employee Portal - React

Modern, production-ready React-based employee portal for Carolina Lumpers Service. Fully functional replacement for the legacy HTML portal with enhanced UX, real-time updates, and comprehensive admin tools.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Backend Integration](#backend-integration)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to existing Google Apps Script backend
- Modern browser with geolocation support

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# Opens at http://localhost:5173

# Run proxy server for direct Sheets access (optional)
cd server
npm install
npm start
# Opens at http://localhost:3001
```

### First Time Setup

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Configure `.env.local`:
   ```env
   VITE_API_BASE_URL=https://cls-proxy.s-garay.workers.dev
   VITE_SIGNUP_URL=https://script.google.com/macros/s/.../exec
   ```

3. Start development:
   ```bash
   npm run dev
   ```

4. Login with existing credentials or create account at `/signup`

---

## ✨ Features

### For Workers
✅ **GPS-based Clock-In** - High-accuracy geolocation with 0.3 mile geofence validation  
✅ **Real-time Clock-In History** - Today's entries with status badges (confirmed, pending, editing)  
✅ **Payroll View** - Weekly/monthly summaries with detailed breakdown (hours, rate, earnings)  
✅ **Time Edit Requests** - Submit corrections for admin approval  
✅ **W-9 Management** - Submit W-9 forms, track approval status with real-time banner  
✅ **Profile Management** - View and update personal information  
✅ **Multilingual Support** - Full translation in English, Spanish, Portuguese  

### For Admins/Leads
✅ **All Workers Dashboard** - Real-time overview of today's activity with status badges  
✅ **Time Edit Approvals** - Review and approve/deny worker time correction requests  
✅ **W-9 Approvals** - Review submitted W-9s with PDF viewer integration  
✅ **Worker Management** - View detailed worker history (future: CRUD operations)  
✅ **Role-based Access** - Admin tools only visible to authorized roles  

### Technical Features
✅ **Progressive Web App (PWA)** - Installable, works offline  
✅ **Direct Sheets Access** - Fast read-only API via OAuth service account (optional proxy server)  
✅ **Auto-refresh** - Real-time data updates every 30-60 seconds  
✅ **Responsive Design** - Mobile-first, works on all devices  
✅ **Dark Mode Ready** - Theme context implemented (toggle UI coming soon)  
✅ **Session Persistence** - Stay logged in across browser refreshes  
✅ **Error Boundaries** - Graceful error handling prevents crashes  
✅ **Loading States** - Clear feedback during API calls  

---

## 📁 Project Structure

```
react-portal/
├── public/
│   └── assets/              # Icons, images (shared with legacy site)
│
├── server/                  # Optional: Direct Sheets API proxy
│   ├── sheets-proxy.js      # Express server with OAuth service account
│   ├── service-account-key.json  # Google Cloud credentials (DO NOT COMMIT)
│   └── package.json
│
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AdminPanel.jsx           # Admin tools container
│   │   ├── AllWorkersView.jsx       # Worker overview dashboard
│   │   ├── Badge.jsx                # Status badges (6 variants)
│   │   ├── Button.jsx               # Reusable button (5 variants, 3 sizes)
│   │   ├── Card.jsx                 # Card container with variants
│   │   ├── ClockInButton.jsx        # GPS clock-in with loading states
│   │   ├── ClockInHistory.jsx       # Today's entries table
│   │   ├── DrawerNavigation.jsx     # Mobile drawer menu
│   │   ├── Loading.jsx              # Spinner component
│   │   ├── PayrollView.jsx          # Payroll summary with date ranges
│   │   ├── Table.jsx                # Reusable table with custom columns
│   │   ├── TabNavigation.jsx        # Tab switcher with badges
│   │   ├── TimeEditRequests.jsx     # Admin time edit approval UI
│   │   ├── UserSwitcher.jsx         # Dev tool for testing roles
│   │   ├── W9Management.jsx         # Admin W-9 approval UI
│   │   └── W9StatusBanner.jsx       # Worker W-9 status alert
│   │
│   ├── features/
│   │   └── auth/
│   │       ├── AuthContext.jsx      # Global authentication state
│   │       └── PrivateRoute.jsx     # Protected route wrapper
│   │
│   ├── pages/               # Route-level components
│   │   ├── Dashboard.jsx            # Main worker dashboard (tabs)
│   │   ├── Login.jsx                # Login page with language selector
│   │   ├── Signup.jsx               # Registration page
│   │   ├── ProfilePage.jsx          # User profile (future)
│   │   ├── PayrollPage.jsx          # Full payroll view (future)
│   │   ├── ReportsPage.jsx          # Admin reports (future)
│   │   └── NotFound.jsx             # 404 page
│   │
│   ├── services/            # API layer
│   │   ├── api.js                   # Backend API calls (30+ functions)
│   │   ├── sheets.js                # Direct Sheets access (optional)
│   │   └── storage.js               # localStorage wrapper
│   │
│   ├── i18n/                # Internationalization
│   │   ├── config.js                # i18next setup
│   │   ├── en.json                  # English translations (100+ keys)
│   │   ├── es.json                  # Spanish translations
│   │   └── pt.json                  # Portuguese translations
│   │
│   ├── contexts/
│   │   └── ThemeContext.jsx         # Dark mode context (ready for toggle)
│   │
│   ├── layouts/
│   │   └── DashboardLayout.jsx      # Main layout with header/nav
│   │
│   ├── hooks/               # Custom React hooks (future)
│   ├── utils/               # Utility functions (future)
│   │
│   ├── App.jsx              # Root component with routing
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles + Tailwind imports
│
├── .env.example             # Environment template
├── .env.local               # Local environment (DO NOT COMMIT)
├── package.json
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind theme (cls-amber, cls-charcoal)
└── postcss.config.js
```

---

## 🛠️ Technology Stack

### Core
- **React 18.3** - UI library with concurrent features
- **Vite 5.4** - Next-generation build tool (instant HMR)
- **React Router 6.26** - Client-side routing with data loading

### State Management
- **TanStack Query 5.56** - Server state management with caching
- **Zustand 5.0** - Lightweight client state (future use)
- **React Context** - Auth state, theme context

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - CSS processing with autoprefixer
- **Custom Design Tokens** - `cls-amber`, `cls-charcoal` colors

### Internationalization
- **i18next 23.15** - Translation framework
- **react-i18next 15.0** - React bindings for i18next
- **3 Languages** - English, Spanish, Portuguese (100+ keys each)

### Development
- **Vitest 2.1** - Unit testing (setup, not yet written)
- **@testing-library/react 16.0** - React testing utilities
- **ESLint** - Code linting

### PWA
- **vite-plugin-pwa 0.20** - Progressive Web App support
- **Service Workers** - Offline capabilities (future implementation)

### Backend Integration
- **Google Apps Script** - Serverless backend (unchanged)
- **Cloudflare Workers** - CORS proxy (`cls-proxy.s-garay.workers.dev`)
- **Google Sheets API v4** - Direct read access via OAuth service account (optional)

---

## 🔌 Backend Integration

### Primary API: Google Apps Script Web App

**Endpoint:** `https://cls-proxy.s-garay.workers.dev`  
**Proxy Target:** `https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec`

**Available Actions** (30+ API functions):
```javascript
// Authentication
api.login(email, password, lang, device)
api.signup(userData)
api.whoami(workerId)

// Clock-In
api.clockIn(workerId, lat, lng, lang, email)
api.getReport(workerId)
api.getTimeEntryStatus(workerId, recordId)

// Time Edits
api.submitTimeEdit(employeeId, recordId, originalTime, requestedTime, reason)
api.getTimeEditRequests(requesterId, status)
api.approveTimeEdit(requesterId, requestId)
api.denyTimeEdit(requesterId, requestId, reason)

// Payroll
api.getPayroll(workerId, dateRange)
api.getPayrollPdf(workerId, dateRange)

// W-9
api.getW9Status(workerId)
api.listPendingW9s(requesterId)
api.approveW9(w9RecordId, adminId)
api.rejectW9(w9RecordId, adminId, reason)

// Admin
api.getReportAll(workerId, workerFilter)
```

### Secondary API: Direct Sheets Access (Optional)

**Endpoint:** `http://localhost:3001` (local proxy server)  
**Purpose:** Fast read-only access to Google Sheets via OAuth service account  
**Use Cases:** Loading large datasets, reports, exports

**Setup:**
```bash
cd server
npm install
# Add service-account-key.json from Google Cloud Console
npm start
```

**Available Functions:**
```javascript
// From src/services/sheets.js
sheetsApi.getWorkersDirect()                    // Workers sheet
sheetsApi.getPayrollDirect(workerId, date)      // Payroll LineItems
sheetsApi.getClockInsDirect(workerId, date)     // ClockIn sheet
```

**When to Use:**
- ✅ Fast reads for dashboards/reports
- ✅ Exporting large datasets
- ❌ Writing data (use Apps Script API)
- ❌ Complex business logic (use Apps Script API)

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production (dist/)
npm run preview          # Preview production build

# Testing (future)
npm test                 # Run unit tests with Vitest
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage report

# Linting
npm run lint             # Run ESLint
```

### Development Server

```bash
# Terminal 1: React app
cd react-portal
npm run dev
# http://localhost:5173

# Terminal 2: Direct Sheets proxy (optional)
cd react-portal/server
npm start
# http://localhost:3001

# Terminal 3: Legacy site (for comparison)
cd carolina-lumpers-web
python -m http.server 8010
# http://localhost:8010
```

### Environment Variables

Create `.env.local`:
```env
# API Endpoints
VITE_API_BASE_URL=https://cls-proxy.s-garay.workers.dev
VITE_SIGNUP_URL=https://script.google.com/macros/s/.../exec

# Feature Flags (future)
VITE_ENABLE_DIRECT_SHEETS=false
VITE_ENABLE_OFFLINE_MODE=false

# Analytics (future)
VITE_GOOGLE_ANALYTICS_ID=
```

### Dev Tools

**UserSwitcher Component** (Dev only):
- Purple floating button in bottom-right
- Switch between users to test different roles
- Auto-hidden in production
- See `USER_SWITCHER.md` for details

**React DevTools:**
- Install browser extension
- Inspect component tree
- View props, state, context

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
# Output: dist/ folder
```

### Deployment Options

#### **Option 1: Same GCP Bucket (Subdirectory)**
```bash
# Build React app
npm run build

# Deploy to subfolder
gsutil -m rsync -r dist gs://carolina-lumpers-web/portal

# Access at: https://carolinalumpers.com/portal/
```

#### **Option 2: Separate Subdomain**
```bash
# Build
npm run build

# Deploy to dedicated bucket
gsutil -m rsync -r dist gs://portal-carolinalumpers-web

# Configure DNS: portal.carolinalumpers.com
```

#### **Option 3: AWS S3 + CloudFront** (Future with CDK)
```bash
cd ../aws-infrastructure
cdk deploy cls-frontend-stack
# Deploys to S3 with CloudFront CDN
```

### Environment-Specific Builds

```bash
# Development build (with source maps)
npm run build -- --mode development

# Production build (optimized)
npm run build -- --mode production
```

---

## 📚 Documentation

### Main Documentation
- **QUICKSTART.md** - Get started in 5 minutes
- **SETUP.md** - Detailed setup guide
- **PHASE_1_COMPLETE.md** - Dashboard core functionality
- **PHASE_2_COMPLETE.md** - Admin tools implementation
- **DASHBOARD_REFACTOR_COMPLETE.md** - Architecture decisions

### Feature Documentation
- **USER_SWITCHER.md** - Dev tool for testing roles
- **DIRECT_SHEETS_ACCESS.md** - Proxy server setup
- **COLOR_DEMO_GUIDE.md** - Design system colors
- **LOGIN_COLOR_GUIDE.md** - Login page theming
- **TIME_DISPLAY_BUG_FIX.md** - Timezone handling

### Project-Wide Docs
- **../.github/copilot-instructions.md** - Complete system architecture
- **../.github/MULTI_DEVICE_SETUP.md** - Multi-device development
- **../.github/DATABASE_SCHEMA.md** - Google Sheets structure
- **../docs/MODERNIZATION_PLAN.md** - Migration strategy

---

## 🧪 Testing

### Manual Testing Checklist

**Worker Features:**
- [ ] Login with existing credentials
- [ ] GPS clock-in with permission handling
- [ ] View today's clock-in history
- [ ] Check payroll for different date ranges
- [ ] Submit time edit request
- [ ] Submit W-9 form
- [ ] Check W-9 status banner updates
- [ ] Test language switching (EN/ES/PT)
- [ ] Test on mobile device

**Admin Features:**
- [ ] Login as Admin/Lead user
- [ ] View all workers dashboard
- [ ] See real-time worker status
- [ ] Approve/deny time edit requests
- [ ] Review W-9 submissions
- [ ] Approve/reject W-9s
- [ ] Test auto-refresh (60s intervals)

**Cross-browser:**
- [ ] Chrome/Edge (Chromium)
- [ ] Safari (iOS/macOS)
- [ ] Firefox
- [ ] Mobile browsers

### Unit Testing (Setup, Not Yet Written)

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

**Test Structure:**
```
src/
├── components/
│   ├── Button.test.jsx
│   ├── Card.test.jsx
│   └── ...
└── services/
    └── api.test.js
```

---

## 🐛 Known Issues

1. **Service Worker** - PWA offline mode not fully implemented yet
2. **Push Notifications** - Planned for Phase 3
3. **Dark Mode Toggle** - Context exists, UI toggle not added
4. **Unit Tests** - Framework setup, tests not written
5. **Worker Details Modal** - "View Details" button placeholder only

---

## 🔜 Roadmap

### Phase 3 (Planned)
- [ ] Worker details modal (full history)
- [ ] Bulk approval actions
- [ ] Advanced filters and search
- [ ] Export reports (CSV, PDF)
- [ ] Real-time updates via WebSocket
- [ ] Push notifications
- [ ] Dark mode toggle UI
- [ ] Language switcher in settings

### Phase 4 (Future)
- [ ] Unit test coverage (80%+)
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG AA)
- [ ] PWA offline mode improvements
- [ ] Migration to AWS infrastructure

---

## 🤝 Contributing

This is a private project for Carolina Lumpers Service. For questions or issues:

**Developer:** Steve Garay - s.garay@carolinalumpers.com  
**Repository:** https://github.com/GarayInvestments/carolina-lumpers-web  
**Documentation:** See `.github/copilot-instructions.md`

---

## 📄 License

Proprietary - Carolina Lumpers Service © 2025

---

**Last Updated:** January 2025  
**Status:** Production Ready (Phase 2 Complete)  
**Version:** 0.1.0
