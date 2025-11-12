# CLS Employee Portal - React

Modern React-based employee portal for Carolina Lumpers Service.

## Setup

```bash
# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Project Structure

```
src/
├── components/      # Reusable UI components (Button, Card, Table)
├── pages/          # Page-level components (Login, Dashboard)
├── features/       # Feature modules (auth, clockin, payroll)
├── services/       # API layer (api.js)
├── i18n/           # Internationalization (en.json, es.json, pt.json)
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
└── App.jsx         # Root component
```

## Backend Integration

This app connects to the existing Google Apps Script backend via:
- **API Endpoint:** `https://cls-proxy.s-garay.workers.dev`
- **Actions:** login, clockin, report, payroll, etc.
- **No backend changes required**

## Technology Stack

- **React 18** - UI library
- **Vite** - Build tool (fast, modern)
- **React Router** - Client-side routing
- **TanStack Query** - API state management
- **i18next** - Internationalization (EN/ES/PT)
- **Zustand** - Global state management
- **Tailwind CSS** - Utility-first styling
- **Vite PWA** - Progressive Web App capabilities

## Development Notes

- Runs on port 5173 (old site runs on 8010)
- Uses same backend API (Google Apps Script)
- Shares assets folder with old site
- Independent deployment (can run side-by-side)
