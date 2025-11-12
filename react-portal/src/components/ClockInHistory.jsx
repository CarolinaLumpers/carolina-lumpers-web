import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import Table from './Table';
import Badge from './Badge';
import Loading from './Loading';

const ClockInHistory = ({ refreshTrigger }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isRefetching, setIsRefetching] = React.useState(false);

  // Fetch clock-in report with improved caching
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clockInReport', user.workerId],
    queryFn: async () => {
      const result = await api.getReport(user.workerId);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: 2, // Retry failed requests
    enabled: !isRefetching, // Prevent concurrent fetches
  });

  // Trigger refetch when refreshTrigger changes (after successful clock-in)
  React.useEffect(() => {
    if (refreshTrigger > 0 && !isRefetching) {
      setIsRefetching(true);
      refetch().finally(() => {
        // Delay to prevent immediate re-render issues
        setTimeout(() => setIsRefetching(false), 1000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const getStatusBadge = (status) => {
    const statusMap = {
      confirmed: { variant: 'success', label: t('common.confirmed', 'Confirmed') },
      pending: { variant: 'warning', label: t('common.pending', 'Pending') },
      editing: { variant: 'info', label: t('common.editing', 'Editing') },
      denied: { variant: 'error', label: t('common.denied', 'Denied') },
    };

    const statusInfo = statusMap[status?.toLowerCase()] || { variant: 'default', label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const columns = [
    {
      header: t('common.date', 'Date'),
      accessor: 'date',
      // Backend sends date as "MM/dd/yyyy" string - parse and reformat
      cell: (row) => {
        try {
          // Backend format: "01/17/2025" -> Convert to "MMM dd, yyyy"
          const [month, day, year] = row.date.split('/');
          const dateObj = new Date(year, month - 1, day);
          return format(dateObj, 'MMM dd, yyyy');
        } catch {
          return row.date; // Fallback to raw date string
        }
      },
    },
    {
      header: t('common.time', 'Time'),
      accessor: 'time',
      // Backend sends time as "2:26:53 PM" string - use directly
      cell: (row) => row.time || '12:00 AM',
    },
  ];

  if (isLoading) {
    return <Loading message={t('common.loading', 'Loading...')} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">
          {t('errors.loadFailed', 'Failed to load data. Please try again.')}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {error.message || 'Unknown error'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 text-cls-amber hover:underline"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  // Check if data is available
  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard.noData', 'No data available')}
        </p>
      </div>
    );
  }

  // Filter to today's entries
  // Backend date format: "01/17/2025" (MM/dd/yyyy)
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", { 
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
  const today = formatter.format(now); // e.g., "01/17/2025"

  // API returns 'records' array
  const allEntries = data.records || data.entries || data.clockins || [];

  const todayEntries = allEntries.filter(entry => {
    // Backend sends date as "MM/dd/yyyy" string - compare directly
    return entry.date === today;
  });

  return (
    <Table
      columns={columns}
      data={todayEntries}
      emptyMessage={t('dashboard.noEntriesToday', 'No clock-ins yet today. Clock in to get started!')}
    />
  );
};

export default ClockInHistory;
