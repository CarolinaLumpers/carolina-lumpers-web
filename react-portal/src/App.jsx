import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { PrivateRoute } from './features/auth/PrivateRoute'
import './i18n/config'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'

// Auth Pages
import Login from './pages/Login'
import LoginColorDemo from './pages/LoginColorDemo'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'

// Dashboard Pages (Role-specific)
import WorkerDashboard from './pages/WorkerDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import AdminDashboard from './pages/AdminDashboard'

// Feature Pages (All roles)
import TimeEntriesPage from './pages/TimeEntriesPage'
import PayrollPage from './pages/PayrollPage'
import ProfilePage from './pages/ProfilePage'

// Supervisor Pages (Lead only)
import TeamPage from './pages/TeamPage'

// Admin Pages (Admin only)
import WorkersPage from './pages/WorkersPage'
import TimeTrackingPage from './pages/TimeTrackingPage'
import ApprovalsPage from './pages/ApprovalsPage'
import ReportsPage from './pages/ReportsPage'

// Legacy Dashboard (for fallback)
import Dashboard from './pages/Dashboard'

/**
 * Role-based dashboard router
 * Renders appropriate dashboard based on user role
 */
function RoleBasedDashboard() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'Lead':
      return <SupervisorDashboard />;
    case 'Worker':
    default:
      return <WorkerDashboard />;
  }
}

/**
 * Protected route wrapper with role-based access
 * Usage: <ProtectedRoute roles={['Admin', 'Lead']}><Component /></ProtectedRoute>
 */
function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && !roles.includes(user.role)) {
    // User doesn't have required role - redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/login-demo" element={<LoginColorDemo />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes with DashboardLayout */}
            <Route element={<PrivateRoute />}>
              <Route element={<DashboardLayout />}>
                {/* Dashboard - role-based routing */}
                <Route path="/dashboard" element={<RoleBasedDashboard />} />
                
                {/* Common routes - all authenticated users */}
                <Route path="/time-entries" element={<TimeEntriesPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                
                {/* Supervisor routes - Lead only */}
                <Route 
                  path="/team" 
                  element={
                    <ProtectedRoute roles={['Lead', 'Admin']}>
                      <TeamPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin routes - Admin only */}
                <Route 
                  path="/workers" 
                  element={
                    <ProtectedRoute roles={['Admin']}>
                      <WorkersPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/time-tracking" 
                  element={
                    <ProtectedRoute roles={['Admin']}>
                      <TimeTrackingPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/approvals" 
                  element={
                    <ProtectedRoute roles={['Admin']}>
                      <ApprovalsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute roles={['Admin']}>
                      <ReportsPage />
                    </ProtectedRoute>
                  } 
                />
              </Route>
              
              {/* Legacy dashboard route (fallback) */}
              <Route path="/dashboard-old" element={<Dashboard />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
