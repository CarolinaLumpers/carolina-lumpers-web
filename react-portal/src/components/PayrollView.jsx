import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { api } from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import Card from './Card';
import Table from './Table';
import Loading from './Loading';

const PayrollView = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('week'); // week, month, custom

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    let start, end;

    switch (dateRange) {
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        end = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastWeek':
        const lastWeekStart = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        start = lastWeekStart;
        end = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
        break;
      default:
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  };

  const range = getDateRange();

  // Fetch payroll data
  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll', user.workerId, range.start, range.end],
    queryFn: () => api.getPayroll(user.workerId, `${range.start}_${range.end}`),
    staleTime: 60000, // 1 minute
  });

  const columns = [
    {
      header: t('common.date', 'Date'),
      accessor: 'date',
      cell: (row) => format(new Date(row.date), 'MMM dd, yyyy'),
    },
    {
      header: t('common.site', 'Site'),
      accessor: 'site',
    },
    {
      header: t('common.hours', 'Hours'),
      accessor: 'hours',
      cell: (row) => parseFloat(row.hours || 0).toFixed(2),
    },
    {
      header: t('common.rate', 'Rate'),
      accessor: 'rate',
      cell: (row) => row.rate ? `$${parseFloat(row.rate).toFixed(2)}` : '-',
    },
    {
      header: t('common.earnings', 'Earnings'),
      accessor: 'earnings',
      cell: (row) => `$${parseFloat(row.earnings || 0).toFixed(2)}`,
    },
  ];

  if (isLoading) {
    return <Loading message={t('common.loading', 'Loading payroll...')} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">
          {t('errors.loadFailed', 'Failed to load payroll. Please try again.')}
        </p>
      </div>
    );
  }

  const totalHours = data?.entries?.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0) || 0;
  const totalEarnings = data?.entries?.reduce((sum, entry) => sum + parseFloat(entry.earnings || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setDateRange('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            dateRange === 'week'
              ? 'bg-cls-amber text-cls-charcoal'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {t('payroll.thisWeek', 'This Week')}
        </button>
        <button
          onClick={() => setDateRange('lastWeek')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            dateRange === 'lastWeek'
              ? 'bg-cls-amber text-cls-charcoal'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {t('payroll.lastWeek', 'Last Week')}
        </button>
        <button
          onClick={() => setDateRange('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            dateRange === 'month'
              ? 'bg-cls-amber text-cls-charcoal'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {t('payroll.thisMonth', 'This Month')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="amber">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('payroll.totalHours', 'Total Hours')}
            </p>
            <p className="text-3xl font-bold text-cls-charcoal dark:text-white">
              {totalHours.toFixed(2)}
            </p>
          </div>
        </Card>
        <Card variant="amber">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('payroll.totalEarnings', 'Total Earnings')}
            </p>
            <p className="text-3xl font-bold text-cls-charcoal dark:text-white">
              ${totalEarnings.toFixed(2)}
            </p>
          </div>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card title={t('payroll.breakdown', 'Payroll Breakdown')}>
        <Table
          columns={columns}
          data={data?.entries || []}
          emptyMessage={t('payroll.noData', 'No payroll data for this period.')}
        />
      </Card>
    </div>
  );
};

export default PayrollView;
