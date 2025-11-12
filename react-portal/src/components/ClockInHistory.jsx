import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sheetsApi } from '../services/sheets';
import { useAuth } from '../features/auth/AuthContext';
import Table from './Table';
import Badge from './Badge';
import Loading from './Loading';

const ClockInHistory = ({ refreshTrigger }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Get today's date in M/D/YYYY format to match sheet format
  const getTodayDate = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", { 
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
      year: "numeric"
    });
    return formatter.format(now); // e.g., "11/12/2025"
  };

  const todayDate = getTodayDate();

  // Fetch today's clock-ins using Direct Sheets API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clockInsDirect', user.workerId, todayDate, refreshTrigger],
    queryFn: () => sheetsApi.getClockInsDirect(user.workerId, todayDate),
    staleTime: 60000, // 1 minute
    refetchInterval: false, // No polling - only refetch on refreshTrigger change
  });

  const columns = [
    {
      header: t('common.date', 'Date'),
      accessor: 'date',
      cell: (row) => {
        try {
          // Sheet format: "M/D/YYYY" -> Convert to "MMM dd, yyyy"
          const [month, day, year] = row.date.split('/');
          const dateObj = new Date(year, month - 1, day);
          return format(dateObj, 'MMM dd, yyyy');
        } catch {
          return row.date;
        }
      },
    },
    {
      header: t('common.time', 'Time'),
      accessor: 'time',
      cell: (row) => row.time || '12:00 AM',
    },
    {
      header: t('common.site', 'Site'),
      accessor: 'site',
    },
    {
      header: t('common.distance', 'Distance'),
      accessor: 'distance',
      cell: (row) => row.distance ? `${row.distance} mi` : '-',
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

  // Direct Sheets API returns array of clock-ins already filtered to today
  const todayEntries = data || [];

  return (
    <Table
      columns={columns}
      data={todayEntries}
      emptyMessage={t('dashboard.noEntriesToday', 'No clock-ins yet today. Clock in to get started!')}
    />
  );
};

export default ClockInHistory;
