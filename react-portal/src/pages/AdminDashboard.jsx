import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { sheetsApi } from '../services/sheets';
import { format } from 'date-fns';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import UserSwitcher from '../components/UserSwitcher';

/**
 * AdminDashboard - Executive overview with KPIs, alerts, and activity
 * Shows: System-wide metrics, pending items, recent activity
 */
function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Fetch all workers with today's clock-ins (filter Active only)
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['allWorkersDirect'],
    queryFn: async () => {
      const data = await sheetsApi.getAllWorkersWithClockIns();
      // Filter only Active workers (must be explicitly Active)
      const activeWorkers = data.workers.filter(w => 
        w.availability === 'Active'
      );
      return { ...data, workers: activeWorkers };
    },
    staleTime: 60000,
  });

  // Fetch pending W-9s
  const { data: pendingW9s, isLoading: w9Loading } = useQuery({
    queryKey: ['pendingW9sDirect'],
    queryFn: () => sheetsApi.getPendingW9s(),
    staleTime: 60000,
  });

  // Fetch pending time edit requests
  const { data: timeEditRequests, isLoading: timeEditsLoading } = useQuery({
    queryKey: ['timeEditRequestsDirect'],
    queryFn: () => sheetsApi.getTimeEditRequests(),
    staleTime: 60000,
  });

  const workers = teamData?.workers || [];
  const records = teamData?.records || {};
  
  const workersWorkedToday = workers.filter(w => records[w.id]?.length > 0).length;
  const totalClockInsToday = Object.values(records).reduce((sum, arr) => sum + arr.length, 0);
  const pendingW9Count = pendingW9s?.length || 0;
  const pendingTimeEditCount = timeEditRequests?.length || 0;
  const totalPending = pendingW9Count + pendingTimeEditCount;

  // Get recent activity (last 10 clock-ins)
  const recentActivity = Object.entries(records)
    .flatMap(([workerId, entries]) => 
      entries.map(entry => ({
        workerId,
        workerName: workers.find(w => w.id === workerId)?.name || workerId,
        ...entry
      }))
    )
    .sort((a, b) => {
      // Sort by time (most recent first) - rough sort by time string
      return b.time.localeCompare(a.time);
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-anton text-gray-800 dark:text-gray-200">
          {t('dashboard.adminDashboard', 'Admin Dashboard')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • {t('dashboard.systemOverview', 'System Overview')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('dashboard.activeToday', 'Active Workers Today')}
              </p>
              <p className="text-4xl font-bold text-cls-charcoal dark:text-white">
                {teamLoading ? '...' : workersWorkedToday}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('dashboard.of', 'of')} {workers.length} {t('dashboard.total', 'total')}
              </p>
            </div>
            <svg className="w-12 h-12 text-cls-amber opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('dashboard.clockInsToday', 'Clock-Ins Today')}
              </p>
              <p className="text-4xl font-bold text-gray-800 dark:text-white">
                {teamLoading ? '...' : totalClockInsToday}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t('dashboard.allSites', 'All sites')}
              </p>
            </div>
            <svg className="w-12 h-12 text-green-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('dashboard.pendingApprovals', 'Pending Approvals')}
              </p>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {w9Loading || timeEditsLoading ? '...' : totalPending}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {pendingW9Count} W-9s, {pendingTimeEditCount} edits
              </p>
            </div>
            <svg className="w-12 h-12 text-orange-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('dashboard.totalWorkers', 'Total Workers')}
              </p>
              <p className="text-4xl font-bold text-gray-800 dark:text-white">
                {teamLoading ? '...' : workers.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('dashboard.activeEmployees', 'Active employees')}
              </p>
            </div>
            <svg className="w-12 h-12 text-blue-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Alerts Section */}
      {totalPending > 0 && (
        <Card variant="amber">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('dashboard.actionRequired', 'Action Required')}
              </h3>
              <div className="space-y-2">
                {pendingW9Count > 0 && (
                  <Link to="/approvals" className="block p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {pendingW9Count} {t('dashboard.pendingW9s', 'Pending W-9 Submissions')}
                      </span>
                      <Badge variant="warning">{t('common.review', 'Review')}</Badge>
                    </div>
                  </Link>
                )}
                {pendingTimeEditCount > 0 && (
                  <Link to="/approvals" className="block p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {pendingTimeEditCount} {t('dashboard.pendingTimeEdits', 'Pending Time Edit Requests')}
                      </span>
                      <Badge variant="warning">{t('common.review', 'Review')}</Badge>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <Card title={t('dashboard.recentActivity', 'Recent Activity')}>
          {teamLoading ? (
            <Loading message={t('common.loading', 'Loading...')} />
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                {t('dashboard.noActivityToday', 'No activity yet today')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-2 bg-cls-amber rounded-full">
                    <svg className="w-4 h-4 text-cls-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {activity.workerName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Clocked in at {activity.site || 'Unknown Site'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card title={t('dashboard.quickActions', 'Quick Actions')}>
          <div className="grid grid-cols-1 gap-3">
            <Link
              to="/workers"
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {t('dashboard.manageWorkers', 'Manage Workers')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboard.viewAllWorkers', 'View all active workers')}
                </p>
              </div>
            </Link>

            <Link
              to="/time-tracking"
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {t('dashboard.timeTracking', 'Time Tracking')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboard.viewAllClockIns', 'View all clock-in records')}
                </p>
              </div>
            </Link>

            <Link
              to="/approvals"
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex items-center justify-between flex-1">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {t('dashboard.approvals', 'Approvals')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dashboard.reviewPending', 'Review pending items')}
                  </p>
                </div>
                {totalPending > 0 && (
                  <Badge variant="warning">{totalPending}</Badge>
                )}
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-cls-amber hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cls-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {t('dashboard.reports', 'Reports & Analytics')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboard.viewReports', 'Generate reports')}
                </p>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* User Switcher - Admin Only (dev tool) */}
      <UserSwitcher />
    </div>
  );
}

export default AdminDashboard;
