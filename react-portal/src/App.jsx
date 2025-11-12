import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthContext'
import { PrivateRoute } from './features/auth/PrivateRoute'
import './i18n/config'

// Pages
import Login from './pages/Login'
import LoginColorDemo from './pages/LoginColorDemo'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

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
            
            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
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
