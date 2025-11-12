# Quick Start Guide - React Portal

## ✅ Phase 0 Complete!

Your React portal is ready to develop in the same repository.

## What You Have Now

```
carolina-lumpers-web/
├── react-portal/          # New React app (you are here!)
│   ├── src/              # React components and logic
│   ├── public/assets/    # Icons copied from main project
│   └── node_modules/     # 500 packages installed ✅
│
├── *.html                # Old HTML pages (still working)
├── css/                  # Old CSS (still working)
└── GoogleAppsScripts/    # Backend (unchanged)
```

## Running the React Portal

### Start Development Server

```powershell
cd react-portal
npm run dev
```

Opens automatically at: **http://localhost:5173**

### Available Routes

- `/login` - Login page (fully functional)
- `/signup` - Signup page (fully functional)
- `/dashboard` - Dashboard (basic layout, needs Phase 1)
- `/anything-else` - 404 page

## Testing Right Now

1. **Start the server:**
   ```powershell
   cd react-portal
   npm run dev
   ```

2. **Visit:** http://localhost:5173/login

3. **Try logging in** with your existing credentials
   - The login connects to the real backend
   - Same Google Apps Script API
   - Session stored in localStorage

4. **Test signup** at http://localhost:5173/signup

5. **After login:** Redirects to /dashboard
   - Shows welcome message
   - Basic clock-in button (not functional yet - Phase 1)
   - User info displayed

## What Works Now

✅ Login (real authentication)  
✅ Signup (creates real account)  
✅ Session persistence  
✅ Protected routes (must login to access dashboard)  
✅ Logout  
✅ Multilingual (EN/ES/PT) - change in URL params  
✅ Dark mode styles (manual toggle not added yet)  
✅ Responsive design  

## What's Coming (Phase 1)

🔄 Clock-in with GPS  
🔄 Time entries table  
🔄 Payroll view  
🔄 W-9 status banner  
🔄 Tab navigation  
🔄 Admin tools  

## Development Tips

### Hot Module Replacement
Edit any `.jsx` file and save - the browser updates **instantly** without full reload!

### React DevTools
Install the React DevTools browser extension to inspect components:
- Chrome: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- Firefox: [React Developer Tools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### File Organization

```
src/
├── pages/           # One file per route
│   ├── Login.jsx
│   ├── Signup.jsx
│   └── Dashboard.jsx
├── components/      # Reusable UI components (Phase 1)
├── features/        # Feature modules
│   └── auth/        # Authentication logic
├── services/        # API calls
│   ├── api.js       # Backend integration
│   └── storage.js   # localStorage wrapper
└── i18n/            # Translations
    ├── en.json
    ├── es.json
    └── pt.json
```

### Adding a New Page

1. Create `src/pages/NewPage.jsx`:
   ```jsx
   function NewPage() {
     return <div>New Page Content</div>;
   }
   export default NewPage;
   ```

2. Add route in `src/App.jsx`:
   ```jsx
   import NewPage from './pages/NewPage'
   
   <Route path="/new" element={<NewPage />} />
   ```

3. Visit: http://localhost:5173/new

### Testing API Calls

Open browser console (F12) to see:
- API requests
- Response data
- Errors
- React component tree (with DevTools)

## Comparing Old vs New

Run **both** sites simultaneously:

```powershell
# Terminal 1: Old site
npm run dev              # → http://localhost:8010

# Terminal 2: New site
cd react-portal
npm run dev              # → http://localhost:5173
```

Both use the **same backend**, so you can compare behavior side-by-side!

## Building for Production

Not needed yet, but when ready:

```powershell
npm run build
```

Creates optimized files in `dist/` folder ready for deployment.

## Common Commands

```powershell
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package-name

# Run tests (when we add them)
npm run test
```

## Workspace Setup (VS Code)

Your workspace is now configured with 3 folders:
1. **Carolina Lumpers Web (Root)** - Main project
2. **React Portal (New)** - React app
3. **Google Apps Scripts** - Backend code

Switch between them in the VS Code Explorer sidebar!

## Next Steps

When you're ready for **Phase 1**, we'll add:
1. Clock-in button with geolocation
2. Time entries table with data from backend
3. Payroll section
4. W-9 status integration
5. Tab navigation system

## Need Help?

- **Full Plan:** See `MODERNIZATION_PLAN.md`
- **Setup Details:** See `SETUP.md` in this folder
- **Backend API:** See `../GoogleAppsScripts/EmployeeLogin/README.md`
- **Project Structure:** See `../PROJECT_STRUCTURE.md`

---

🎉 **Phase 0 Complete!** Your React portal is ready for development.

Run `npm run dev` in this folder to start!
