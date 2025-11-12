import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';
import { sheetsApi } from '../services/sheets';

/**
 * UserSwitcher - Developer tool to quickly switch between users
 * Only shows in development mode AND for Admin users
 * Fetches actual workers from backend
 */
function UserSwitcher() {
  const { user: currentUser, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }
  
  // Only show for Admin users
  if (currentUser?.role !== 'Admin') {
    return null;
  }

  // Fetch actual workers from backend when opened
  useEffect(() => {
    if (isOpen && workers.length === 0 && currentUser) {
      fetchWorkers();
    }
  }, [isOpen]);

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      // Use reportAll API to get all workers (requires current user to be logged in)
      const data = await api.getReportAll(currentUser.workerId);
      
      if (data.ok && data.workers) {
        // Map workers to format we need
        const workerList = data.workers.map(w => ({
          id: w.id,
          name: w.name,
          role: null, // Will fetch on switch
        }));
        setWorkers(workerList);
      }
    } catch (error) {
      console.error('Failed to fetch workers:', error);
      // Fallback to manual test users if API fails
      setWorkers([
        { id: 'CLS001', name: 'Test Admin', role: 'Admin' },
        { id: 'CLS002', name: 'Test Worker', role: 'Worker' },
      ]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const switchToUser = async (worker) => {
    setLoading(true);
    try {
      // Fetch user role from Direct Sheets API (replaces api.whoami)
      const roleData = await sheetsApi.getWorkerRole(worker.id);
      
      if (!roleData.ok) {
        throw new Error(roleData.error || 'Failed to fetch role');
      }
      
      // Create user object with real data
      const newUser = {
        workerId: worker.id,
        displayName: worker.name,
        email: `${worker.id.toLowerCase()}@carolinalumpers.com`,
        role: roleData.role || 'Worker',
        w9Status: 'approved',
      };
      
      // Use login method from AuthContext (which saves to localStorage via storage service)
      login(newUser);
      
      setIsOpen(false);
      
      // Reload page to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch user:', error);
      alert('Failed to switch user. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          title="Switch User (Dev Tool)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-64 border border-purple-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              Switch User (Dev)
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingWorkers ? (
              <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                Loading workers...
              </div>
            ) : workers.length === 0 ? (
              <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                No workers found
              </div>
            ) : (
              workers.map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => switchToUser(worker)}
                  disabled={loading || currentUser?.workerId === worker.id}
                  className={`
                    w-full text-left px-3 py-2 rounded transition-colors
                    ${currentUser?.workerId === worker.id
                      ? 'bg-purple-100 dark:bg-purple-900 border-2 border-purple-600'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {worker.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {worker.id}
                      </div>
                    </div>
                    {currentUser?.workerId === worker.id && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ⚠️ Development only - will not appear in production build
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSwitcher;
