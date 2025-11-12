import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { sheetsApi } from '../services/sheets';
import { format } from 'date-fns';
import Card from '../components/Card';
import ClockInButton from '../components/ClockInButton';
import W9StatusBanner from '../components/W9StatusBanner';
import Loading from '../components/Loading';

/**
 * WorkerDashboard - Simple, action-focused homepage for workers
 * Primary action: Clock in
 * Shows: Today's entries, recent summary, alerts
 */
function WorkerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get today's date in M/D/YYYY format
  const getTodayDate = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", { 
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
      year: "numeric"
    });
    return formatter.format(now);
  };

  const todayDate = getTodayDate();

  // Fetch today's clock-ins
  const { data: todayEntries, isLoading } = useQuery({
    queryKey: ['clockInsDirect', user.workerId, todayDate, refreshTrigger],
    queryFn: () => sheetsApi.getClockInsDirect(user.workerId, todayDate),
    staleTime: 60000,
  });

  const handleClockInSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const entriesCount = todayEntries?.length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('dashboard.welcome', { name: user?.displayName || 'User' })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* W-9 Status Alert */}
      <W9StatusBanner />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="amber">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.todayClockIns', "Today's Clock-Ins")}
            </p>
            <p className="text-4xl font-bold text-cls-charcoal dark:text-white">
              {entriesCount}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.thisWeek', 'This Week')}
            </p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">
              {t('dashboard.comingSoon', 'Coming Soon')}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.lastPay', 'Last Pay')}
            </p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white">
              {t('dashboard.comingSoon', 'Coming Soon')}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clock In Section */}
        <Card variant="amber" title={t('dashboard.clockIn', 'Clock In')}>
          <ClockInButton onSuccess={handleClockInSuccess} />
        </Card>

        {/* Today's Entries */}
        <Card title={t('dashboard.todayEntries', "Today's Entries")}>
          {isLoading ? (
            <Loading message={t('common.loading', 'Loading...')} />
          ) : entriesCount === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">
                {t('dashboard.noClockInsToday', 'No clock-ins yet today')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {t('dashboard.clickClockInToStart', 'Click "Clock In" to get started!')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEntries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {entry.site || 'Unknown Site'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.time}
                    </p>
                  </div>
                  <div className="text-right">
                    {entry.distance && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.distance} mi
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <Link
                to="/time-entries"
                className="block text-center text-cls-amber hover:text-amber-600 text-sm font-medium mt-4"
              >
                {t('dashboard.viewAll', 'View All Entries →')}
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title={t('dashboard.quickActions', 'Quick Actions')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/time-entries"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
          >
            <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {t('dashboard.viewHistory', 'View History')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.allClockIns', 'See all clock-ins')}
              </p>
            </div>
          </Link>

          <Link
            to="/payroll"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
          >
            <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {t('dashboard.viewPayroll', 'View Payroll')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.earnings', 'Check earnings')}
              </p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
          >
            <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {t('dashboard.profile', 'Profile')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.manageAccount', 'Manage account')}
              </p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default WorkerDashboard;
