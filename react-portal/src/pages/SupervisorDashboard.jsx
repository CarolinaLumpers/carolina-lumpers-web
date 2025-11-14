import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { sheetsApi } from '../services/sheets';
import { supabaseApi } from '../services/supabase';
import { format } from 'date-fns';
import Card from '../components/Card';
import ClockInButton from '../components/ClockInButton';
import Badge from '../components/Badge';
import W9StatusBanner from '../components/W9StatusBanner';
import Loading from '../components/Loading';

/**
 * SupervisorDashboard - Hybrid dashboard for supervisors
 * Shows: Own clock-in + team status overview
 */
function SupervisorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get today's date
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

  // Fetch own clock-ins
  const { data: myEntries, isLoading: myEntriesLoading } = useQuery({
    queryKey: ['clockInsDirect', user.workerId, todayDate, refreshTrigger],
    queryFn: () => sheetsApi.getClockInsDirect(user.workerId, todayDate),
    staleTime: 60000,
  });

  const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';

  // Fetch team data
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: useSupabase ? ['allWorkersSupabase'] : ['allWorkersDirect'],
    queryFn: () => {
      if (useSupabase) {
        return supabaseApi.getAllWorkersWithClockIns();
      }
      return sheetsApi.getAllWorkersWithClockIns();
    },
    staleTime: 60000,
  });

  const handleClockInSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const myEntriesCount = myEntries?.length || 0;
  const workers = teamData?.workers || [];
  const records = teamData?.records || {};

  const workersWorkedToday = workers.filter(w => records[w.id]?.length > 0).length;
  const workersNotWorked = workers.length - workersWorkedToday;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('dashboard.supervisorWelcome', { name: user?.displayName || 'Supervisor' })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* W-9 Status Alert */}
      <W9StatusBanner />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="amber">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.myClockIns', 'My Clock-Ins')}
            </p>
            <p className="text-4xl font-bold text-cls-charcoal dark:text-white">
              {myEntriesCount}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.teamWorking', 'Team Working')}
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {teamLoading ? '...' : workersWorkedToday}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.notClockedIn', 'Not Clocked In')}
            </p>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {teamLoading ? '...' : workersNotWorked}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('dashboard.totalTeam', 'Total Team')}
            </p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {teamLoading ? '...' : workers.length}
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

        {/* My Today's Entries */}
        <Card title={t('dashboard.myTodayEntries', "My Today's Entries")}>
          {myEntriesLoading ? (
            <Loading message={t('common.loading', 'Loading...')} />
          ) : myEntriesCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                {t('dashboard.noClockInsYet', 'No clock-ins yet today')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myEntries.map((entry, index) => (
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
            </div>
          )}
        </Card>
      </div>

      {/* Team Status */}
      <Card title={t('dashboard.teamStatus', 'Team Status Today')}>
        {teamLoading ? (
          <Loading message={t('common.loading', 'Loading team...')} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.slice(0, 9).map((worker) => {
              const workerRecords = records[worker.id] || [];
              const hasClockedIn = workerRecords.length > 0;
              const lastClockIn = workerRecords[workerRecords.length - 1];

              return (
                <div key={worker.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {worker.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {worker.id}
                      </p>
                    </div>
                    <Badge variant={hasClockedIn ? 'success' : 'default'}>
                      {hasClockedIn ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </Badge>
                  </div>
                  {hasClockedIn && lastClockIn && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Last: {lastClockIn.time}</p>
                      {lastClockIn.site && <p>Site: {lastClockIn.site}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Link
          to="/team"
          className="block text-center text-cls-amber hover:text-amber-600 text-sm font-medium mt-4"
        >
          {t('dashboard.viewFullTeam', 'View Full Team →')}
        </Link>
      </Card>

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
                {t('dashboard.myTimeEntries', 'My Time Entries')}
              </p>
            </div>
          </Link>

          <Link
            to="/team"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
          >
            <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {t('dashboard.manageTeam', 'Manage Team')}
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
                {t('dashboard.myPayroll', 'My Payroll')}
              </p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default SupervisorDashboard;
