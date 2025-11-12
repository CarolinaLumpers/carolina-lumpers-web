import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedUser = storage.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    storage.setUser(userData);
  };

  const logout = () => {
    setUser(null);
    storage.clearUser();
  };

  const updateW9Status = (status) => {
    setUser(prev => ({ ...prev, w9Status: status }));
    storage.updateW9Status(status);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateW9Status,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
