import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import DrawerNavigation from '../components/DrawerNavigation';
import ClockInButton from '../components/ClockInButton';
import ClockInHistory from '../components/ClockInHistory';
import PayrollView from '../components/PayrollView';
import W9StatusBanner from '../components/W9StatusBanner';
import AdminPanel from '../components/AdminPanel';
import UserSwitcher from '../components/UserSwitcher';

function Dashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clockins');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClockInSuccess = () => {
    // Trigger refresh of clock-in history
    setRefreshTrigger(prev => prev + 1);
  };

  // Tab configuration
  const tabs = [
    {
      id: 'clockins',
      label: t('dashboard.tabs.timeEntries', 'Time Entries'),
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'payroll',
      label: t('dashboard.tabs.payroll', 'Payroll'),
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // Add Admin tab if user has admin or lead role
  if (user?.role === 'Admin' || user?.role === 'Lead') {
    tabs.push({
      id: 'admin',
      label: t('dashboard.tabs.admin', 'Admin Tools'),
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-cls-dark">
      {/* Drawer Navigation */}
      <DrawerNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} onLogout={handleLogout} />
      
      {/* Main Layout - Add left margin on desktop to account for sidebar */}
      <div className="md:ml-64">
        {/* Header - Hidden on mobile, visible on desktop */}
        <header className="hidden md:block bg-white dark:bg-cls-charcoal border-b border-gray-200 dark:border-gray-700">
          <div className="mx-auto px-4 py-4 max-w-7xl flex items-center gap-6">
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-anton text-cls-amber">CAROLINA</span>
              <span className="text-2xl font-anton text-cls-amber">LUMPER</span>
              <span className="text-2xl font-anton text-cls-amber">SERVICE</span>
            </div>
            <div className="border-l border-gray-300 dark:border-gray-600 h-16"></div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {t('dashboard.title', 'CLS Employee Portal')}
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto px-4 py-8 max-w-7xl">
          {/* Page Title - Shows active section */}
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {tabs.find(tab => tab.id === activeTab)?.icon && 
                React.createElement(tabs.find(tab => tab.id === activeTab).icon, { 
                  className: "w-8 h-8 text-cls-amber" 
                })
              }
              <h2 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {t('dashboard.welcome', { name: user?.displayName || 'User' })}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user?.role && (
                <span className="inline-block px-2 py-1 bg-cls-amber text-cls-charcoal rounded text-sm font-medium">
                  {user.role}
                </span>
              )}
            </p>
          </div>

          {/* W-9 Status Banner */}
          <W9StatusBanner />

          {/* Content */}
          {activeTab === 'clockins' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Time In Button */}
              <div className="space-y-6">
                <Card variant="amber" title={t('dashboard.timeIn', 'Time In')}>
                  <ClockInButton onSuccess={handleClockInSuccess} />
                </Card>
              </div>

              {/* Right Column - Today's Entries */}
              <div className="space-y-6 lg:row-span-2">
                <Card title={t('dashboard.todayEntries', "Today's Entries")}>
                  <ClockInHistory refreshTrigger={refreshTrigger} />
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="max-w-7xl">
              <PayrollView />
            </div>
          )}

          {activeTab === 'admin' && (
            <AdminPanel user={user} />
          )}
        </main>
      </div>
      
      {/* User Switcher - Dev Tool (only shows in development) */}
      <UserSwitcher />
    </div>
  );
}

export default Dashboard;
