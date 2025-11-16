import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '../services/supabase';
import { useAuth } from '../features/auth/AuthContext';
import Table from './Table';
import Badge from './Badge';
import Loading from './Loading';

const ClockInHistory = ({ refreshTrigger }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Fetch today's clock-ins from Supabase
  const { data: clockIns, isLoading, error, refetch } = useQuery({
    queryKey: ['clockInsToday', user.workerId, refreshTrigger],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from('clock_ins')
        .select('*')
        .eq('worker_id', user.workerId)
        .gte('clock_in_time', `${today}T00:00:00`)
        .lte('clock_in_time', `${today}T23:59:59`)
        .order('clock_in_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // 1 minute
    refetchInterval: false,
  });

  const columns = [
    {
      header: t('common.date', 'Date'),
      accessor: 'clock_in_time',
      cell: (row) => {
        try {
          return format(parseISO(row.clock_in_time), 'MMM dd, yyyy');
        } catch {
          return '-';
        }
      },
    },
    {
      header: t('common.time', 'Time'),
      accessor: 'clock_in_time',
      cell: (row) => {
        try {
          return format(parseISO(row.clock_in_time), 'h:mm a');
        } catch {
          return '-';
        }
      },
    },
    {
      header: t('common.site', 'Site'),
      accessor: 'site_name',
      cell: (row) => row.site_name || '-',
    },
    {
      header: t('common.distance', 'Distance'),
      accessor: 'distance_miles',
      cell: (row) => row.distance_miles ? `${row.distance_miles} mi` : '-',
    },
    {
      header: t('common.status', 'Status'),
      accessor: 'edit_status',
      cell: (row) => {
        const statusMap = {
          'confirmed': { variant: 'success', label: 'Confirmed' },
          'pending': { variant: 'warning', label: 'Pending' },
          'editing': { variant: 'info', label: 'Editing' },
          'denied': { variant: 'error', label: 'Denied' }
        };
        const status = statusMap[row.edit_status] || statusMap['confirmed'];
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
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

  return (
    <Table
      columns={columns}
      data={clockIns}
      emptyMessage={t('dashboard.noEntriesToday', 'No clock-ins yet today. Clock in to get started!')}
    />
  );
};

export default ClockInHistory;
