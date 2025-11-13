import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { sheetsApi } from '../services/sheets';
import { useAuth } from '../features/auth/AuthContext';
import Card from './Card';
import Table from './Table';
import Loading from './Loading';

const PayrollView = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [dateRange, setDateRange] = useState('week'); // week, lastWeek, month

    // Calculate date range and filter options
    const getFilterOptions = () => {
        const today = new Date();

        switch (dateRange) {
            case 'week': {
                // This week: Use Week Period (Saturday of current week)
                const saturday = endOfWeek(today, { weekStartsOn: 0 }); // Sunday start, Saturday end
                return {
                    filterType: 'week',
                    weekPeriod: format(saturday, 'yyyy-MM-dd'),
                };
            }
            case 'lastWeek': {
                // Last week: Use Week Period (Saturday of last week)
                const lastWeekSaturday = subDays(endOfWeek(today, { weekStartsOn: 0 }), 7);
                return {
                    filterType: 'week',
                    weekPeriod: format(lastWeekSaturday, 'yyyy-MM-dd'),
                };
            }
            case 'month': {
                // This month: Use Date range
                const start = startOfMonth(today);
                const end = endOfMonth(today);
                return {
                    filterType: 'dateRange',
                    startDate: format(start, 'yyyy-MM-dd'),
                    endDate: format(end, 'yyyy-MM-dd'),
                };
            }
            default: {
                // Default to this week
                const saturday = endOfWeek(today, { weekStartsOn: 0 });
                return {
                    filterType: 'week',
                    weekPeriod: format(saturday, 'yyyy-MM-dd'),
                };
            }
        }
    };

    const filterOptions = getFilterOptions();

    // Fetch payroll data using direct Sheets API
    const { data, isLoading, error } = useQuery({
        queryKey: ['payroll-direct', user.workerId, dateRange, filterOptions],
        queryFn: () => sheetsApi.getPayrollDirect(user.workerId, filterOptions),
        staleTime: 60000, // 1 minute
    });

    const columns = [
        {
            header: t('common.date', 'Date'),
            accessor: 'date',
            width: '90px',
            cell: (row) => {
                try {
                    return format(new Date(row.date), 'MM/dd/yy');
                } catch {
                    return row.date;
                }
            },
        },
        {
            header: t('common.description', 'Description'),
            accessor: 'description',
        },
        {
            header: t('common.amount', 'Amount'),
            accessor: 'amount',
            cell: (row) => `$${parseFloat(row.amount || 0).toFixed(2)}`,
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

    const totalEntries = data?.totals?.count || 0;
    const totalEarnings = data?.totals?.totalAmount || 0;

    return (
        <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setDateRange('week')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateRange === 'week'
                            ? 'bg-cls-amber text-cls-charcoal'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    {t('payroll.thisWeek', 'This Week')}
                </button>
                <button
                    onClick={() => setDateRange('lastWeek')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateRange === 'lastWeek'
                            ? 'bg-cls-amber text-cls-charcoal'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    {t('payroll.lastWeek', 'Last Week')}
                </button>
                <button
                    onClick={() => setDateRange('month')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateRange === 'month'
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
                            {t('payroll.totalEntries', 'Total Entries')}
                        </p>
                        <p className="text-3xl font-bold text-cls-charcoal dark:text-white">
                            {totalEntries}
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
