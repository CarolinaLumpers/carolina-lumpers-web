# UserSwitcher Component

A developer-only tool for quickly switching between user accounts to test different roles and permissions without logging out.

## Overview

The UserSwitcher component appears as a floating purple button in the bottom-right corner of the dashboard. It allows developers to:
- View all active workers from the database
- Switch to any user with one click
- Test Admin, Lead, and Worker roles
- Verify role-based UI visibility

**Note**: This component is **automatically hidden in production builds** via `import.meta.env.PROD` check.

## Features

- ✅ Fetches real workers from backend via `api.getReportAll()`
- ✅ Shows worker names and IDs from Workers sheet
- ✅ Highlights current user with purple border
- ✅ Auto-fetches user role after switching
- ✅ Reloads page to apply new user context
- ✅ Dev-only (hidden in production)
- ✅ Purple theme matching app design

## Usage

### In Development

The UserSwitcher automatically appears on the dashboard when running in development mode:

```powershell
cd react-portal
npm run dev
```

Navigate to http://localhost:5174/dashboard and you'll see a purple button labeled "👤" in the bottom-right corner.

### Switching Users

1. Click the purple "👤" button
2. Panel opens showing list of workers
3. Your current user is highlighted with a purple border
4. Click any worker to switch to that user
5. Page reloads with new user context

### Testing Different Roles

```javascript
// Switch to Admin user (SG-001)
// → Should see: Admin Tools tab with 3 sub-tabs
// → Can approve time edits, W-9 forms, view all workers

// Switch to Lead user (DMR-002)
// → Should see: Admin Tools tab (limited)
// → Can view workers, approve some requests

// Switch to Worker user (MA-003)
// → Should see: Only Clock-Ins and Payroll tabs
// → Cannot see Admin Tools
```

## Implementation Details

### File Location
```
react-portal/src/components/UserSwitcher.jsx
```

### Integration
Added to `Dashboard.jsx`:

```javascript
import UserSwitcher from '../components/UserSwitcher';

// At end of JSX (before closing </div>)
<UserSwitcher />
```

### Key Functions

```javascript
// Fetch real workers from backend
const fetchWorkers = async () => {
  const result = await api.getReportAll(currentUser.workerId);
  // Maps response to { id, name, role }
};

// Switch to selected user
const switchToUser = async (worker) => {
  const roleData = await api.whoami(worker.id);
  const newUser = {
    workerId: worker.id,
    displayName: worker.name,
    email: `${worker.id.toLowerCase()}@carolinalumpers.com`,
    role: roleData.role || 'Worker',
    w9Status: 'approved',
  };
  login(newUser); // Uses AuthContext login method
  window.location.reload();
};
```

### AuthContext Integration

The component uses the `login()` method from AuthContext (not direct state manipulation):

```javascript
const { user: currentUser, login } = useAuth();
```

**Important**: Do NOT use `setUser` (doesn't exist). Always use `login(userData)` which:
- Updates user state
- Saves to localStorage
- Triggers re-render

## Styling

- **Button**: Fixed position, bottom-right, purple background (#8B5CF6)
- **Panel**: Absolute positioned, slides up from button
- **Current User**: Purple border (border-purple-500)
- **Hover States**: Darker purple on hover
- **Scrollable List**: Max height 384px (96rem)

## Testing Checklist

When using UserSwitcher to test features:

### ✅ Role-Based UI Visibility
- [ ] Admin sees all 3 Admin Tools sub-tabs
- [ ] Lead sees Admin Tools (may have limited access)
- [ ] Worker sees NO Admin Tools tab

### ✅ Time Edit Workflow
- [ ] Switch to Worker → Submit time edit request
- [ ] Switch to Admin → See pending request in Time Edit Requests tab
- [ ] Approve/Deny request
- [ ] Switch back to Worker → Verify status updated

### ✅ W-9 Management
- [ ] Switch to Worker with pending W-9
- [ ] Verify W-9 status banner shows
- [ ] Switch to Admin → Approve W-9
- [ ] Switch back to Worker → Verify banner gone

### ✅ Data Isolation
- [ ] Each worker sees only their own clock-ins
- [ ] Each worker sees only their own payroll
- [ ] Admin can view any worker's data via "View As"

## Code Example

```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import * as api from '../services/api';

export default function UserSwitcher() {
  const { user: currentUser, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dev-only check
  if (import.meta.env.PROD) {
    return null; // Hide in production
  }

  // Fetch workers when opened
  useEffect(() => {
    if (isOpen && workers.length === 0) {
      fetchWorkers();
    }
  }, [isOpen]);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const result = await api.getReportAll(currentUser.workerId);
      // Parse and set workers...
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchToUser = async (worker) => {
    if (!confirm(`Switch to ${worker.name}?`)) return;
    
    try {
      const roleData = await api.whoami(worker.id);
      const newUser = { /* ... */ };
      login(newUser);
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch user:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Button and panel UI... */}
    </div>
  );
}
```

## Troubleshooting

### UserSwitcher not appearing
1. Check you're running in development mode: `npm run dev`
2. Verify `import.meta.env.PROD` is `false`
3. Check Dashboard.jsx has `<UserSwitcher />` component

### "setUser is not a function" error
- ✅ **Fixed**: Component now uses `login()` method from AuthContext
- ❌ Don't use: `setUser(newUser)` (doesn't exist)
- ✅ Use: `login(newUser)` (correct method)

### Workers list is empty
1. Check backend API is accessible
2. Verify `api.getReportAll()` returns data
3. Check browser console for errors
4. Verify Workers sheet has data

### Switch doesn't work / page doesn't reload
1. Verify `login()` method is called
2. Check `window.location.reload()` is executed
3. Verify new user data is valid
4. Check localStorage for updated user data

## Future Enhancements

- [ ] Add keyboard shortcut (Ctrl+Shift+U) to toggle
- [ ] Remember last opened state in sessionStorage
- [ ] Add search/filter for large worker lists
- [ ] Show worker role badges in the list
- [ ] Add "Recent Users" quick-switch section
- [ ] Persist original user for easy switch back
- [ ] Add confirmation modal with role preview

## Related Files

- `react-portal/src/components/UserSwitcher.jsx` - Component implementation
- `react-portal/src/pages/Dashboard.jsx` - Integration point
- `react-portal/src/features/auth/AuthContext.jsx` - Authentication context
- `react-portal/src/services/api.js` - API service for backend calls
