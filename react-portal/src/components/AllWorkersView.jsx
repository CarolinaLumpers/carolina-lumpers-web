import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from './Card';
import Badge from './Badge';
import Loading from './Loading';

/**
 * AllWorkersView - Display all workers with today's clock-in status
 */
function AllWorkersView({ user }) {
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reportAll', user.workerId],
    queryFn: () => api.getReportAll(user.workerId),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });

  if (isLoading) {
    return <Loading message={t('admin.loading.workers', 'Loading workers...')} />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {t('admin.error.loadWorkers', 'Failed to load workers')}
          </p>
          <button
            onClick={() => refetch()}
            className="text-cls-amber hover:text-amber-600"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </Card>
    );
  }

  const workers = data?.workers || [];
  const records = data?.records || {};

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('admin.workers.title', "Today's Worker Activity")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('admin.workers.total', 'Total Workers')}: {workers.length}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-cls-amber transition-colors"
            title={t('common.refresh', 'Refresh')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </Card>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => {
          const workerRecords = records[worker.id] || [];
          const hasClockedIn = workerRecords.length > 0;
          const lastClockIn = workerRecords[workerRecords.length - 1];

          return (
            <Card key={worker.id} variant="default">
              <div className="space-y-3">
                {/* Worker Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                      {worker.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {worker.id}
                    </p>
                  </div>
                  <Badge variant={hasClockedIn ? 'success' : 'default'}>
                    {hasClockedIn 
                      ? t('admin.workers.active', 'Active')
                      : t('admin.workers.inactive', 'No Clock-In')
                    }
                  </Badge>
                </div>

                {/* Clock-In Info */}
                {hasClockedIn && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('admin.workers.clockIns', 'Clock-Ins')}:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {workerRecords.length}
                      </span>
                    </div>
                    {lastClockIn && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('admin.workers.lastClockIn', 'Last')}:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {lastClockIn.time}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* View Details Button */}
                <button
                  className="w-full mt-2 px-3 py-2 text-sm text-cls-amber hover:bg-amber-50 dark:hover:bg-gray-800 rounded transition-colors"
                  onClick={() => {
                    // TODO: Open worker details modal
                    console.log('View details for:', worker.id);
                  }}
                >
                  {t('admin.workers.viewDetails', 'View Details')}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {workers.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {t('admin.workers.noWorkers', 'No workers found')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AllWorkersView;
